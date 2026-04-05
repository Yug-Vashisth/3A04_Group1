from fastapi import FastAPI
from routers import disaster_predictor_router, alert_rules_router, alerts_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # <-- this allows any origin
    allow_credentials=True,
    allow_methods=["*"],      # allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],      # allow all headers
)

# include your router
app.include_router(disaster_predictor_router.disaster_router)
app.include_router(alert_rules_router.router)
app.include_router(alerts_router.router)