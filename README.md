# Real-Time National Land Acquisition & Management System
### End-to-End Digital Monitoring and Decision Support System for Government of India Infrastructure Corridors

An enterprise-grade, full-stack government web application compliant with the statutory mandates of the **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR Act 2013)**.

Designed for complete local portability—clonable from GitHub and executable on any Windows computer with standard Python and Node.js environments without complex configuration or external cloud dependencies.

---

## 🏛️ System Features & Core Modules

1. **Executive Decision Support Dashboard**
   - Live KPI cards derived from SQLite database (Active Projects, Total Acreage, Disbursed Compensation, Pending Sanctions).
   - Dynamic charts via **Recharts** (State-wise acreage distribution, acquisition stages breakdown).
   - Corridor progress indicators with automatic delay detection.
   - Comprehensive system activity audit trails.

2. **Cadastral Land Records & Title Registry**
   - Full CRUD management of land parcels.
   - Cadastral survey number indexing, village/taluk mapping, land classification, and circle rate tracking.
   - Ground title verification status (`Verified`, `Pending`, `Rejected`) with officer remarks.
   - Integrated ownership document attachments.

3. **Strategic Acquisition Projects**
   - Multi-category infrastructure monitoring: **Highways**, **Railways (Freight Corridors)**, **Airports**, **Industrial Zones (SEZ)**, and **Port Corridors**.
   - Dynamic parcel association: link individual land parcels to projects with acquisition milestones (Identified, Surveyed, Approved, Acquired).
   - Milestone progress computation and deadline tracking with delay alerts.

4. **Interactive GIS Spatial Map (React Leaflet & OpenStreetMap)**
   - Zero-API-key spatial mapping powered by OpenStreetMap tiles.
   - Custom colored pins reflecting real-time acquisition stages:
     - 🟢 **Green**: Available / Registered
     - 🟠 **Amber**: Under Acquisition (Sec 4 Gazette)
     - 🔵 **Blue**: Fully Acquired (Possession Taken)
     - 🔴 **Red**: Disputed / In Litigation
   - Clickable interactive marker popups with survey number, owner details, area, and circle rate.
   - Dynamic district and status filters with auto-centering.

5. **Local Document Verification & Scrutiny**
   - Digital repository for Title Deeds (Form 7/12, Patta, RTC Pahani), Cadastral Survey Sketches, and Aadhaar/Voter ID proofs.
   - District Collectorate scrutiny workflow with formal approval/rejection remarks.
   - Secure local file storage under `media/documents/`.

6. **Statutory Compensation Management & Simulated DBT Disbursement**
   - **RFCTLARR Act 2013 Statutory Engine**:
     - $\text{Base Land Value} = \text{Land Area (Acres)} \times \text{Valuation Rate / Acre}$
     - $\text{Mandatory 100\% Solatium} = 100\% \times \text{Base Land Value}$
     - Additional compensation for standing assets (fruit trees, structures, borewells).
     - Statutory Resettlement & Rehabilitation (R&R) allowance.
   - Real-time calculation preview modal.
   - **Simulated DBT/PFMS Gateway**: Generates unique central transaction UTR numbers (e.g. `PFMS-20261124-E30C795F`), updates parcel acquisition status, and dispatches in-app citizen alerts.

7. **Multi-Tier Administrative Approvals Workflow**
   - Strict hierarchical governance clearance chain:
     $$\text{Department Officer (SLAO)} \longrightarrow \text{District Collector} \longrightarrow \text{State Revenue Secretary} \longrightarrow \text{National Administrator}$$
   - Role-enforced clearance permissions on backend API.
   - Complete audit trail tracking each officer's decision, timestamp, and notes.

8. **Citizen Grievance Redressal Mechanism**
   - Citizens and landowners can lodge compensation delay inquiries, valuation disputes, and boundary concerns.
   - Department officers can conduct inquiries, update status (`Under Review`, `Action Taken`, `Resolved`), and issue formal resolution remarks.

9. **Rule-Based Decision Support & Predictive Alerts**
   - Autonomous heuristics analyzing database records:
     - Overdue corridor detection past target completion dates.
     - Title verification backlog warnings.
     - Unprocessed award disbursement alerts.
     - Actionable recommendations (e.g. deploy mobile survey camps, expedite PFMS batch runs).

10. **Statutory Audit PDF Reports (Python ReportLab)**
    - Instant one-click vector PDF generation:
      1. National Acquisition Projects Summary
      2. Land Records & Title Inventory
      3. Statutory Compensation & PFMS Disbursement Audit
      4. Administrative Clearances & Sanctions Log
      5. District-Wise Performance & Expenditure Audit

---

## 👥 Demonstration User Roles & Credentials

The system comes pre-seeded with 5 distinct role accounts. Each role has specific permissions and scoped data visibility.

| Role | Username | Password | Jurisdiction & Scope |
| :--- | :--- | :--- | :--- |
| **National Administrator** | `admin` | `password123` | National level; full approval & clearance authority |
| **State Officer** | `state_officer` | `password123` | Maharashtra State Revenue; multi-district sanction |
| **District Officer** | `district_officer` | `password123` | District Collector (Pune); title verification & award sanction |
| **Department Officer** | `dept_officer` | `password123` | Special Land Acquisition Officer (NHAI / Corridors) |
| **Landowner** | `landowner` | `password123` | Citizen portal (Ramesh Patil); view awards & lodge grievances |

> **Quick Switch Feature**: While logged in, you can switch between any demo role instantly using the **Demo Role** dropdown in the top navigation bar.

---

## 💻 Tech Stack

- **Backend**: Python 3.10+, Django 5.x, Django REST Framework, django-cors-headers, ReportLab, Pillow.
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Leaflet, React Leaflet, Lucide React.
- **Database**: SQLite3 (`db.sqlite3` with Django ORM).
- **Architecture**: Decoupled RESTful API with Session and Token Header authentication.

---

## 🚀 Setup & Execution Guide (Windows PowerShell)

### Prerequisites
Make sure you have installed on your computer:
1. **Python 3.10+** (Added to PATH)
2. **Node.js 18+ & npm** (Added to PATH)
3. **Git**

---

### Step 1: Clone the Repository
```powershell
git clone <repository_url>
cd land-acquisition-system
```

---

### Step 2: Backend Setup & Server Startup
Open a Windows PowerShell terminal in the project directory:

```powershell
# 1. Navigate to backend
cd backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Apply database migrations
python manage.py migrate

# 6. Seed demonstration database (States, Districts, Projects, Parcels, Awards, Approvals, Users)
python manage.py seed_data

# 7. Start Django development server
python manage.py runserver
```

The backend API will be running at: `http://127.0.0.1:8000/`

---

### Step 3: Frontend Setup & Server Startup
Open a **second** Windows PowerShell terminal in the project directory:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install Node dependencies
npm install

# 3. Launch Vite development server
npm run dev
```

The frontend application will be running at: `http://localhost:5173/`

---

### Step 4: Access the Application
Open your web browser and navigate to:
```
http://localhost:5173
```
- Click on any of the **one-click demonstration role buttons** on the login page (or type `admin` / `password123`) to begin exploring the system!

---

## 🧪 Automated Test Suite

To verify all 11 core module workflows, run the automated integration test script from the `backend` folder:

```powershell
cd backend
.\venv\Scripts\python.exe test_workflows.py
```

---

## 📁 Repository Directory Structure

```
land-acquisition-system/
├── backend/
│   ├── config/                     # Django project settings & URL routing
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/                   # User model, RBAC, Auth, Notifications, ActivityLog
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── authentication.py
│   │   └── management/commands/seed_data.py
│   ├── land/                       # State, District, LandParcel, OwnershipDocument
│   ├── projects/                   # AcquisitionProject, ProjectLandParcel
│   ├── compensation/               # Compensation calculation & simulated DBT
│   ├── approvals/                  # Multi-tier approval workflow & history
│   ├── grievances/                 # Citizen grievance redressal
│   ├── analytics/                  # Decision support heuristics & ReportLab PDFs
│   │   └── reports.py              # Vector PDF generation
│   ├── manage.py
│   ├── requirements.txt
│   └── test_workflows.py           # Comprehensive integration test suite
├── frontend/
│   ├── src/
│   │   ├── api/client.js           # Axios configuration & interceptors
│   │   ├── context/                # AuthContext & ToastContext
│   │   ├── components/             # Navbar, Sidebar, Modal, Badges, Loaders
│   │   ├── pages/                  # 12 government-style enterprise views
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── media/                          # Local directory for uploaded certificates & deeds
├── .gitignore
└── README.md
```

---

## ⚖️ Statutory Compliance & References

- **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (Act No. 30 of 2013)**
  - *Section 4*: Preliminary notification and social impact assessment.
  - *Section 23*: Enquiry and land acquisition award by Collector.
  - *Section 30(1)*: Mandatory 100% Solatium over and above the market value.
- **Public Financial Management System (PFMS)** simulation for direct benefit transfers to beneficiary bank accounts.

---

*Academic demonstration project developed for real-time digital monitoring and decision support in national infrastructure land acquisition.*
