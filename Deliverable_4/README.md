# SCEMAS — Smart City Environmental Monitoring and Alert System

## Running Locally

You need to start both the backend and frontend separately.

### Backend

```bash
cd Deliverable_4/Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`  
Swagger docs available at `http://localhost:8000/docs`

### Frontend

Open a second terminal:

```bash
cd Deliverable_4/Frontend
npm install
npm run dev
```

The site will be running at `http://localhost:5173`

---

> Make sure you have a `.env` file in `Deliverable_4/Backend/` with your MongoDB credentials before starting the backend. Contact a team member for the credentials if you don't have them.