import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')  

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

products = [
    {
        "id": str(uuid.uuid4()),
        "name": "Netflix Premium",
        "description": "4 telas simultâneas em Ultra HD",
        "platform": "Netflix",
        "price": 29.90,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1637363990764-de84fd247b7d?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["4 telas simultâneas", "Qualidade Ultra HD", "Download ilimitado", "Catálogo completo"],
        "isAvailable": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Spotify Premium",
        "description": "Música sem anúncios e offline",
        "platform": "Spotify",
        "price": 19.90,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1706879350865-e1cdb3792b22?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["Sem anúncios", "Download offline", "Qualidade de áudio superior", "Pular músicas ilimitado"],
        "isAvailable": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Disney+ Premium",
        "description": "Todo o conteúdo Disney, Pixar, Marvel e Star Wars",
        "platform": "Disney+",
        "price": 27.90,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1662338571360-e20bfb6f2545?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["4K Ultra HD", "4 dispositivos simultâneos", "Download ilimitado", "Conteúdo exclusivo"],
        "isAvailable": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "HBO Max Premium",
        "description": "Séries e filmes HBO originais",
        "platform": "HBO Max",
        "price": 34.90,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1761044590940-9e3205a60b92?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["Qualidade 4K", "3 telas simultâneas", "Lançamentos Warner Bros", "Conteúdo HBO"],
        "isAvailable": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Amazon Prime Video",
        "description": "Streaming de filmes, séries e frete grátis",
        "platform": "Amazon Prime",
        "price": 14.90,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1662466767400-27c176fab51b?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["Frete grátis Amazon", "Prime Video", "Prime Music", "Prime Reading"],
        "isAvailable": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "YouTube tPremium",
        "description": "YouTube sem anúncios e música incluída",
        "platform": "YouTube",
        "price": 1,
        "duration": "1 mês",
        "image": "https://images.unsplash.com/photo-1611162616475-46b635cb6868?crop=entropy&cs=srgb&fm=jpg&q=85",
        "features": ["Sem anúncios", "Download de vídeos", "YouTube Music Premium", "Reprodução em segundo plano"],
        "isAvailable": True
    }
]

coupons = [
    {"code": "BEMVINDO10", "discount": 0.10, "isActive": True},
    {"code": "STREAM20", "discount": 0.20, "isActive": True},
    {"code": "PRIMEIRA15", "discount": 0.15, "isActive": True}
]

async def seed():
    existing = await db.products.find_one({})
    if existing:
        print("Database already seeded")
        return
    
    for product in products:
        product["createdAt"] = datetime.now(timezone.utc)
    
    await db.products.insert_many(products)
    await db.coupons.insert_many(coupons)
    print(f"Inserted {len(products)} products and {len(coupons)} coupons")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
