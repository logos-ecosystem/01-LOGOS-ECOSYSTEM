"""Simple LOGOS API with authentication endpoints."""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import hashlib
import json
import os

app = FastAPI(
    title="LOGOS Ecosystem API",
    description="AI-Native Ecosystem Platform API with Authentication",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory user storage (for demo purposes)
# In production, this would use the database
users_file = "/tmp/logos_users.json"
if os.path.exists(users_file):
    with open(users_file, 'r') as f:
        users = json.load(f)
else:
    users = {}

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    username: str  # This is email
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class User(BaseModel):
    id: str
    email: str
    full_name: str

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def save_users():
    with open(users_file, 'w') as f:
        json.dump(users, f)

# Routes
@app.get("/")
async def root():
    return {"message": "LOGOS Ecosystem API", "version": "1.0.0"}

@app.get("/api/v1/health/")
async def health_check():
    return {"status": "healthy", "service": "logos-backend"}

@app.post("/api/v1/auth/register", response_model=User)
async def register(user_data: UserRegister):
    # Check if user exists
    if user_data.email in users:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = hashlib.md5(user_data.email.encode()).hexdigest()
    users[user_data.email] = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_hash": hash_password(user_data.password)
    }
    save_users()
    
    return User(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name
    )

@app.post("/api/v1/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    # Check user exists
    if login_data.username not in users:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    user = users[login_data.username]
    if user["password_hash"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate simple token (in production, use JWT)
    token = hashlib.sha256(f"{login_data.username}:{login_data.password}".encode()).hexdigest()
    
    return Token(access_token=token)

@app.post("/api/v1/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}

@app.get("/api/v1/users/me")
async def get_current_user():
    # In production, this would validate the JWT token
    # For now, return a demo user
    return {
        "id": "demo-user-id",
        "email": "demo@logosecosystem.com",
        "full_name": "Demo User"
    }

@app.get("/api/v1/agents/")
async def list_agents():
    # Return sample agents
    return {
        "total": 100,
        "agents": [
            {
                "id": "agent-1",
                "name": "Code Assistant",
                "category": "Programming",
                "description": "AI agent specialized in code generation and debugging"
            },
            {
                "id": "agent-2", 
                "name": "Design Expert",
                "category": "Design",
                "description": "AI agent for UI/UX design and creative tasks"
            },
            {
                "id": "agent-3",
                "name": "Data Analyst",
                "category": "Analytics", 
                "description": "AI agent for data analysis and visualization"
            }
        ]
    }

# Add more endpoints as needed
@app.get("/openapi.json")
async def get_openapi():
    return app.openapi()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)