# SALVE ESTE ARQUIVO COMO: server.py
# Execute com: python server.py

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, json, jwt, uvicorn
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import mercadopago
from contextlib import asynccontextmanager
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Config
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")
MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

if not MERCADOPAGO_ACCESS_TOKEN:
    raise RuntimeError("MERCADOPAGO_ACCESS_TOKEN NÃO DEFINIDO")

if not MERCADOPAGO_PUBLIC_KEY:
    raise RuntimeError("MERCADOPAGO_PUBLIC_KEY NÃO DEFINIDO")

print("🔑 MP ACCESS TOKEN:", MERCADOPAGO_ACCESS_TOKEN[:10] if MERCADOPAGO_ACCESS_TOKEN else None)
print("🔑 MP PUBLIC KEY:", MERCADOPAGO_PUBLIC_KEY[:10] if MERCADOPAGO_PUBLIC_KEY else None)

mp = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== VALORES MÍNIMOS POR MÉTODO ==========
MIN_AMOUNTS = {
    "pix": 0.50,
    "boleto": 5.00,
    "credit_card": 0.50,
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("id", unique=True)
        await db.orders.create_index("id", unique=True)
        logger.info("✅ Database indexes created")
    except Exception as e:
        logger.error(f"Error creating indexes: {str(e)}")
    yield
    client.close()

app = FastAPI(title="StreamShop API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ========== MODELS ==========
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    firstName: str
    lastName: str
    phone: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user: User

class Product(BaseModel):
    id: str
    name: str
    description: str
    platform: str
    price: float
    duration: str
    image: str
    features: List[str]
    isAvailable: bool = True

class CartItem(BaseModel):
    productId: str
    quantity: int

class Coupon(BaseModel):
    code: str
    discount: float
    isActive: bool = True

class OrderItem(BaseModel):
    productId: str
    name: str
    price: float
    quantity: int

class Identification(BaseModel):
    type: str = "CPF"
    number: str

class PaymentMethodData(BaseModel):
    token: Optional[str] = None
    installments: int = 1
    paymentMethodId: str
    issuerId: Optional[str] = None
    transactionAmount: float

class CustomerInfo(BaseModel):
    email: EmailStr
    firstName: str
    lastName: str
    phone: str
    address: str
    city: str
    postalCode: str
    country: str
    documentType: Optional[str] = "CPF"
    documentNumber: Optional[str] = None
    identification: Optional[Identification] = None

class PaymentRequest(BaseModel):
    paymentData: PaymentMethodData
    customerInfo: CustomerInfo
    items: List[OrderItem]
    subtotal: float
    discount: float
    total: float
    couponCode: Optional[str] = None
    userId: Optional[str] = None
    sessionId: str
    paymentMethod: str = "credit_card"

class PixData(BaseModel):
    qrCode: str
    qrCodeBase64: str
    expirationDate: Optional[str] = None

class BoletoData(BaseModel):
    boletoUrl: str
    barcode: str
    expirationDate: Optional[str] = None

class PaymentResponse(BaseModel):
    status: str
    orderId: str
    paymentId: Optional[str] = None
    paymentMethod: str
    message: str
    pix: Optional[PixData] = None
    boleto: Optional[BoletoData] = None

# ========== AUTH ==========
def create_token(user_id: str) -> str:
    return jwt.encode({"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    except:
        return None

async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    except:
        return None

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(400, "Email already registered")
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    user = User(**user_dict)
    doc = user.model_dump()
    doc["password"] = pwd_context.hash(password)
    doc["createdAt"] = doc["createdAt"].isoformat()
    await db.users.insert_one(doc)
    return TokenResponse(token=create_token(user.id), user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(creds: UserLogin):
    user_doc = await db.users.find_one({"email": creds.email})
    if not user_doc or not pwd_context.verify(creds.password, user_doc.get("password", "")):
        raise HTTPException(401, "Invalid credentials")
    user_doc["createdAt"] = datetime.fromisoformat(user_doc["createdAt"]) if isinstance(user_doc["createdAt"], str) else user_doc["createdAt"]
    user = User(**{k: v for k, v in user_doc.items() if k not in ["password", "_id"]})
    return TokenResponse(token=create_token(user.id), user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(401, "Not authenticated")
    return User(**current_user)

# ========== PRODUCTS ==========
@api_router.get("/products")
async def get_products():
    return await db.products.find({}, {"_id": 0}).to_list(100)

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    return product

# ========== CART ==========
@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str, user: Optional[dict] = Depends(get_optional_user)):
    query = {"sessionId": session_id}
    if user:
        query = {"$or": [{"sessionId": session_id}, {"userId": user["id"]}]}
    cart = await db.carts.find_one(query, {"_id": 0})
    return cart if cart else {"items": []}

@api_router.post("/cart/{session_id}")
async def update_cart(session_id: str, items: List[CartItem], user: Optional[dict] = Depends(get_optional_user)):
    cart_data = {"sessionId": session_id, "items": [item.model_dump() for item in items], "updatedAt": datetime.now(timezone.utc).isoformat()}
    if user:
        cart_data["userId"] = user["id"]
    await db.carts.update_one({"sessionId": session_id}, {"$set": cart_data}, upsert=True)
    return {"success": True}

# ========== COUPONS ==========
@api_router.get("/coupons/validate/{code}")
async def validate_coupon(code: str):
    coupon = await db.coupons.find_one({"code": code.upper(), "isActive": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(404, "Invalid coupon code")
    return coupon

# ========== ORDERS ==========
@api_router.get("/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(401, "Not authenticated")
    return await db.orders.find({"userId": current_user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(100)

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order

# ========== PAYMENTS ==========
@api_router.post("/payments/process", response_model=PaymentResponse)
async def process_payment(req: PaymentRequest):
    try:
        logger.info(f"💳 Processando {req.paymentMethod} para {req.customerInfo.email} | Total: R$ {req.total:.2f}")
        order_id = str(uuid.uuid4())

        # CORREÇÃO: validar valor mínimo por método de pagamento
        min_val = MIN_AMOUNTS.get(req.paymentMethod, 0.50)
        if req.total < min_val:
            raise HTTPException(
                400,
                f"Valor mínimo para {req.paymentMethod} é R$ {min_val:.2f}. Valor atual: R$ {req.total:.2f}"
            )

        # CORREÇÃO: obter documento de identificação de forma unificada
        doc_number = ""
        doc_type = "CPF"
        if req.customerInfo.identification and req.customerInfo.identification.number:
            doc_number = req.customerInfo.identification.number
            doc_type = req.customerInfo.identification.type or "CPF"
        elif req.customerInfo.documentNumber:
            doc_number = req.customerInfo.documentNumber
            doc_type = req.customerInfo.documentType or "CPF"

        # Validar CPF para PIX e Boleto
        if req.paymentMethod in ["pix", "boleto"]:
            if not doc_number:
                raise HTTPException(400, "CPF/CNPJ obrigatório para PIX e Boleto")
            logger.info(f"📄 Documento: {doc_type} {doc_number[:3]}***")

        # Montar payer base
        payer = {
            "email": req.customerInfo.email,
            "first_name": req.customerInfo.firstName,
            "last_name": req.customerInfo.lastName,
        }
        if doc_number:
            payer["identification"] = {"type": doc_type, "number": doc_number}

        # ---- CARTÃO DE CRÉDITO ----
        if req.paymentMethod == "credit_card":
            if not req.paymentData.token:
                raise HTTPException(400, "Token do cartão é obrigatório")

            body = {
                "transaction_amount": float(req.total),
                "token": req.paymentData.token,
                "description": f"Order {order_id[:8]}",
                "payment_method_id": req.paymentData.paymentMethodId,
                "installments": req.paymentData.installments,
                "payer": {
                    **payer,
                    "phone": {"area_code": "00", "number": req.customerInfo.phone},
                    "address": {
                        "street_name": req.customerInfo.address or "Rua Sem Nome",
                        "street_number": "1",
                        "zip_code": req.customerInfo.postalCode or "01310100",
                    },
                },
                "external_reference": order_id,
                "statement_descriptor": "STREAMSHOP",
            }
            if req.paymentData.issuerId:
                body["issuer_id"] = req.paymentData.issuerId

        # ---- PIX ----
        elif req.paymentMethod == "pix":
            body = {
                "transaction_amount": float(req.total),
                "description": f"Order {order_id[:8]}",
                "payment_method_id": "pix",
                "payer": payer,
                "external_reference": order_id,
            }

        # ---- BOLETO ----
        elif req.paymentMethod == "boleto":
            # CORREÇÃO: boleto exige endereço e identificação completos
            body = {
                "transaction_amount": float(req.total),
                "description": f"Order {order_id[:8]}",
                "payment_method_id": "bolbradesco",
                "payer": {
                    **payer,
                    "address": {
                        "street_name": req.customerInfo.address or "Rua Sem Nome",
                        "street_number": "1",
                        "city": req.customerInfo.city or "São Paulo",
                        "federal_unit": "SP",
                        "zip_code": req.customerInfo.postalCode or "01310100",
                    },
                },
                "external_reference": order_id,
            }

        else:
            raise HTTPException(400, f"Método de pagamento '{req.paymentMethod}' não suportado")

        logger.info(f"📤 Enviando para o MercadoPago:\n{json.dumps(body, indent=2, ensure_ascii=False)}")
        res = mp.payment().create(body)
        logger.info(f"📥 MP Status HTTP: {res['status']}")
        logger.info(f"📥 MP Response:\n{json.dumps(res.get('response', {}), indent=2, ensure_ascii=False)}")

        # CORREÇÃO: log detalhado do erro para facilitar debug
        if res["status"] not in [200, 201]:
            mp_response = res.get("response", {})
            error_msg = mp_response.get("message", "Erro desconhecido do MercadoPago")
            cause = mp_response.get("cause", [])
            logger.error(f"❌ MP rejeitou pagamento: {error_msg} | Cause: {cause}")
            raise HTTPException(400, f"Erro MercadoPago: {error_msg}")

        pay = res["response"]
        pay_status = pay.get("status", "failed")

        # Montar documento do pedido no banco
        order_doc = {
            "id": order_id,
            "userId": req.userId,
            "sessionId": req.sessionId,
            "items": [i.model_dump() for i in req.items],
            "subtotal": req.subtotal,
            "discount": req.discount,
            "total": req.total,
            "customer": req.customerInfo.model_dump(),
            "paymentMethod": req.paymentMethod,
            "mercadopagoPaymentId": pay.get("id"),
            "mercadopagoStatus": pay_status,
            "status": "approved" if pay_status == "approved" else "pending" if pay_status in ["pending", "in_process"] else "failed",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

        # Dados do PIX
        pix_data = None
        if req.paymentMethod == "pix" and pay.get("point_of_interaction"):
            td = pay["point_of_interaction"].get("transaction_data", {})
            qr_code = td.get("qr_code")
            if qr_code:
                order_doc["pixQrCode"] = qr_code
                order_doc["pixQrCodeBase64"] = td.get("qr_code_base64", "")
                pix_data = PixData(
                    qrCode=qr_code,
                    qrCodeBase64=td.get("qr_code_base64", ""),
                    expirationDate=pay.get("date_of_expiration"),
                )
                logger.info("✅ PIX QR Code gerado com sucesso")
            else:
                logger.warning("⚠️ PIX aprovado mas sem QR Code na resposta")

        # Dados do Boleto
        boleto_data = None
        if req.paymentMethod == "boleto" and pay.get("transaction_details"):
            td = pay["transaction_details"]
            boleto_url = td.get("external_resource_url")
            if boleto_url:
                order_doc["boletoUrl"] = boleto_url
                order_doc["boletoBarcode"] = td.get("digitable_line", "")
                boleto_data = BoletoData(
                    boletoUrl=boleto_url,
                    barcode=td.get("digitable_line", ""),
                    expirationDate=pay.get("date_of_expiration"),
                )
                logger.info("✅ Boleto gerado com sucesso")
            else:
                logger.warning("⚠️ Boleto criado mas sem URL na resposta")

        await db.orders.insert_one(order_doc)
        logger.info(f"✅ Pedido {order_id} salvo no banco | Status: {order_doc['status']}")

        return PaymentResponse(
            status=order_doc["status"],
            orderId=order_id,
            paymentId=str(pay.get("id")),
            paymentMethod=req.paymentMethod,
            message=f"Pagamento {pay_status}",
            pix=pix_data,
            boleto=boleto_data,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro inesperado no pagamento: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Erro interno ao processar pagamento: {str(e)}")


@api_router.get("/payments/config")
async def get_config():
    return {"publicKey": MERCADOPAGO_PUBLIC_KEY}

@api_router.get("/payments/status/{payment_id}")
async def get_status(payment_id: str):
    res = mp.payment().get(payment_id)
    if res["status"] != 200:
        raise HTTPException(404, "Payment not found")
    p = res["response"]
    return {
        "status": p.get("status"),
        "statusDetail": p.get("status_detail"),
        "paymentMethod": p.get("payment_method_id"),
    }

@api_router.get("/payments/order/{order_id}")
async def get_payment_by_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    resp = {"success": True, "order": order}
    if order.get("paymentMethod") == "pix" and order.get("pixQrCode"):
        resp["order"]["pix"] = {
            "qrCode": order["pixQrCode"],
            "qrCodeBase64": order.get("pixQrCodeBase64"),
            "expirationDate": None,
        }
    if order.get("paymentMethod") == "boleto" and order.get("boletoUrl"):
        resp["order"]["boleto"] = {
            "boletoUrl": order["boletoUrl"],
            "barcode": order.get("boletoBarcode"),
            "expirationDate": None,
        }
    return resp

# ========== WEBHOOK ==========
@api_router.post("/webhooks/mercadopago")
async def webhook(req: Request, bg: BackgroundTasks):
    try:
        payload = json.loads(await req.body())
        if payload.get("type") == "payment":
            bg.add_task(update_status, payload.get("data", {}).get("id"))
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}

async def update_status(pid: str):
    try:
        res = mp.payment().get(pid)
        if res["status"] == 200:
            p = res["response"]
            new_status = "approved" if p.get("status") == "approved" else "pending" if p.get("status") in ["pending", "in_process"] else "failed"
            await db.orders.update_one(
                {"id": p.get("external_reference")},
                {"$set": {
                    "mercadopagoStatus": p.get("status"),
                    "status": new_status,
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                }},
            )
            logger.info(f"Pedido {p.get('external_reference')} atualizado para {new_status}")
    except Exception as e:
        logger.error(f"Erro ao atualizar status: {str(e)}")

# ========== SEED ==========
@api_router.post("/seed")
async def seed():
    if await db.products.find_one({}):
        return {"message": "Already seeded"}
    seed_products = [
        {"id": str(uuid.uuid4()), "name": "Netflix Premium", "description": "4 telas em Ultra HD", "platform": "Netflix", "price": 29.90, "duration": "1 mês", "image": "https://images.unsplash.com/photo-1637363990764-de84fd247b7d?w=800", "features": ["4 telas", "Ultra HD", "Download", "Catálogo completo"], "isAvailable": True},
        {"id": str(uuid.uuid4()), "name": "Spotify Premium", "description": "Música sem anúncios", "platform": "Spotify", "price": 19.90, "duration": "1 mês", "image": "https://images.unsplash.com/photo-1706879350865-e1cdb3792b22?w=800", "features": ["Sem anúncios", "Offline", "Alta qualidade"], "isAvailable": True},
        {"id": str(uuid.uuid4()), "name": "Disney+", "description": "Disney, Pixar, Marvel, Star Wars", "platform": "Disney+", "price": 27.90, "duration": "1 mês", "image": "https://images.unsplash.com/photo-1662338571360-e20bfb6f2545?w=800", "features": ["4K", "4 dispositivos", "Download"], "isAvailable": True},
    ]
    await db.products.insert_many(seed_products)
    await db.coupons.insert_many([
        {"code": "BEMVINDO10", "discount": 0.10, "isActive": True},
        {"code": "STREAM20", "discount": 0.20, "isActive": True},
    ])
    return {"message": "Seeded", "products": len(seed_products)}

# ========== HEALTH ==========
@app.get("/")
async def root():
    return {"status": "ok", "service": "StreamShop API", "docs": "/docs"}

@app.get("/bia")
async def bia():
    return {"status": "Eu te amoo ❤️", "service": "StreamShop API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), reload=False)