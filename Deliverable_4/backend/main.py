from fastapi import FastAPI
from routers import disaster_predictor_router, alert_rules_router, alerts_router

app = FastAPI()

# include your router
app.include_router(disaster_predictor_router.disaster_router)
app.include_router(alert_rules_router.router)