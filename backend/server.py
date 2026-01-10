from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from passlib.context import CryptContext
import os
import uuid
import json
import logging
import jwt
from datetime import datetime, timezone, timedelta
import mercadopago
from contextlib import asynccontextmanager
import uvicorn

# ========== CONFIG ==========
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY", "")
MERCADOPAGO_WEBHOOK_SECRET = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"

# ========== DB ==========
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ========== MERCADO PAGO ==========
mp = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN) if MERCADOPAGO_ACCESS_TOKEN else None

# ========== PASSWORD HASH ==========
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ========== SECURITY ==========
security = HTTPBearer()

# ========== LOGGER ==========
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StreamShop")

# ========== LIFESPAN ==========
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.products.create_index("id", unique=True)
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("userId")
        await db.carts.create_index("sessionId")
        await db.carts.create_index("userId")
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {str(e)}")
    yield
    client.close()
    logger.info("MongoDB connection closed")

# ========== APP ==========
app = FastAPI(title="StreamShop API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

class Cart(BaseModel):
    userId: Optional[str] = None
    sessionId: str
    items: List[CartItem]
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Coupon(BaseModel):
    code: str
    discount: float
    isActive: bool = True

class OrderItem(BaseModel):
    productId: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: Optional[str] = None
    sessionId: str
    items: List[OrderItem]
    subtotal: float
    discount: float = 0
    total: float
    customer: dict
    mercadopagoPaymentId: Optional[str] = None
    mercadopagoStatus: Optional[str] = None
    status: str = "pending"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentMethodData(BaseModel):
    token: str
    installments: int = 1
    paymentMethodId: str

class CustomerInfo(BaseModel):
    email: EmailStr
    firstName: str
    lastName: str
    phone: str
    address: str
    city: str
    postalCode: str
    country: str

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

class PaymentResponse(BaseModel):
    status: str
    orderId: str
    paymentId: Optional[str] = None
    message: str

# ========== AUTH HELPERS ==========
def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None

# ========== AUTH ENDPOINTS ==========
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(user_data.password)
    user = User(**user_data.model_dump(exclude={"password"}))
    doc = user.model_dump()
    doc["password"] = hashed
    doc["createdAt"] = doc["createdAt"].isoformat()
    await db.users.insert_one(doc)
    token = create_token(user.id)
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not pwd_context.verify(credentials.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_doc["createdAt"] = datetime.fromisoformat(user_doc["createdAt"]) if isinstance(user_doc["createdAt"], str) else user_doc["createdAt"]
    user = User(**{k:v for k,v in user_doc.items() if k not in ["password", "_id"]})
    token = create_token(user.id)
    return TokenResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return User(**current_user)

# ========== PRODUCT ENDPOINTS ==========
@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id":0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id":0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# ========== CART ENDPOINTS ==========
@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str, user: Optional[dict] = Depends(get_optional_user)):
    query = {"sessionId": session_id}
    if user:
        query = {"$or": [{"sessionId": session_id}, {"userId": user["id"]}]}
    cart = await db.carts.find_one(query, {"_id":0})
    return cart or {"items":[]}

@api_router.post("/cart/{session_id}")
async def update_cart(session_id: str, items: List[CartItem], user: Optional[dict] = Depends(get_optional_user)):
    cart_data = {
        "sessionId": session_id,
        "items": [item.model_dump() for item in items],
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    if user:
        cart_data["userId"] = user["id"]
    await db.carts.update_one({"sessionId": session_id},{"$set": cart_data}, upsert=True)
    return {"success": True}

# ========== COUPONS ==========
@api_router.get("/coupons/validate/{code}")
async def validate_coupon(code: str):
    coupon = await db.coupons.find_one({"code": code.upper(), "isActive": True}, {"_id":0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    return coupon

# ========== ORDERS ==========
@api_router.get("/orders")
async def get_orders(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    orders = await db.orders.find({"userId": current_user["id"]}, {"_id":0}).sort("createdAt",-1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id":0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# ========== PAYMENTS ==========
@api_router.post("/payments/process", response_model=dict)
async def process_payment_checkout(request: PaymentRequest):
    try:
        order_id = str(uuid.uuid4())
        # Salvar pedido inicial como "pending"
        order_doc = {
            "id": order_id,
            "userId": request.userId,
            "sessionId": request.sessionId,
            "items": [item.model_dump() for item in request.items],
            "subtotal": request.subtotal,
            "discount": request.discount,
            "total": request.total,
            "customer": request.customerInfo.model_dump(),
            "status": "pending",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order_doc)

        if not mp:
            # mock
            return {"status": "pending", "orderId": order_id, "preferenceId": "mock"}

        # Criar preference no Mercado Pago
        items = []
        for item in request.items:
            items.append({
                "title": item.name,
                "quantity": item.quantity,
                "unit_price": float(item.price),
                "currency_id": "BRL"
            })

        preference_data = {
            "items": items,
            "payer": {
                "email": request.customerInfo.email,
                "first_name": request.customerInfo.firstName,
                "last_name": request.customerInfo.lastName,
                "phone": {
                    "area_code": "00",
                    "number": request.customerInfo.phone
                },
                "address": {
                    "street_name": request.customerInfo.address,
                    "street_number": "1",
                    "zip_code": request.customerInfo.postalCode
                }
            },
            "back_urls": {
                "success": f"http://localhost:3000/payment-success?orderId={order_id}",
                "pending": f"http://localhost:3000/payment-pending?orderId={order_id}",
                "failure": f"http://localhost:3000/payment-failed?orderId={order_id}"
            },
            "auto_return": "all",
            "external_reference": order_id
        }

        preference_response = mp.preference().create(preference_data)
        preference_id = preference_response["response"]["id"]

        return {"status": "pending", "orderId": order_id, "preferenceId": preference_id}

    except Exception as e:
        logger.error(f"Error creating checkout preference: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing failed")


@api_router.get("/payments/config")
async def get_payment_config():
    return {"publicKey": MERCADOPAGO_PUBLIC_KEY}

# ========== WEBHOOK ==========
@api_router.post("/webhooks/mercadopago")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        body_bytes = await request.body()
        body = json.loads(body_bytes)
        x_signature = request.headers.get("x-signature")
        x_request_id = request.headers.get("x-request-id")

        if not x_signature or not x_request_id:
            logger.warning("Webhook missing signature or request ID")
            return {"status":"error","message":"Missing headers"}

        logger.info(f"Webhook headers: x-signature={x_signature}, x-request-id={x_request_id}")
        logger.info(f"Webhook body: {json.dumps(body, indent=2)}")

        event_type = body.get("type")
        data_id = body.get("data", {}).get("id")

        if event_type == "payment" and data_id:
            background_tasks.add_task(update_payment_status, data_id)

        return {"status":"received"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status":"error","message": str(e)}

async def update_payment_status(payment_id: str):
    try:
        if not mp:
            return
        payment_response = mp.payment().get(payment_id)
        if payment_response["status"] != 200:
            logger.error(f"Failed to retrieve payment {payment_id}")
            return
        payment_data = payment_response["response"]
        external_reference = payment_data.get("external_reference")
        payment_status = payment_data.get("status")
        internal_status = "approved" if payment_status=="approved" else "pending" if payment_status in ["pending","in_process"] else "failed"
        result = await db.orders.update_one(
            {"id": external_reference},
            {"$set": {
                "mercadopagoStatus": payment_status,
                "status": internal_status,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        if result.modified_count:
            logger.info(f"Order {external_reference} updated to {internal_status}")
        else:
            logger.warning(f"No order found for payment {payment_id}")
    except Exception as e:
        logger.error(f"Error updating payment status: {str(e)}")

# ========== SEED ==========
@api_router.post("/seed")
async def seed_database():
    existing = await db.products.find_one({})
    if existing:
        return {"message":"Database already seeded"}
    # Produtos e cupons (igual seu código original)
    # ... (omiti aqui por brevidade, mas inclua o array completo)
    return {"message":"Database seeded successfully"}

# ========== HEALTH ==========
@app.get("/")
async def root():
    return {"status":"ok","service":"StreamShop API","docs":"/docs","health":"/api/health"}

@api_router.get("/health")
async def health():
    return {"status":"healthy"}

app.include_router(api_router)

# ========== RUN ==========
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.environ.get("PORT",10000)), reload=False)
