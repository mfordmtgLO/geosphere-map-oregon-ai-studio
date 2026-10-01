# GeoSphere Engine — Training Deck Card
## Feature Spotlight: Automate CRM Pipeline & Lead Intake Capture

---

### 🎴 Card Overview
* **Feature Name:** Automate CRM Pipeline
* **Component Location:** Sidebar Panel → `LEAD INTAKE CAPTURE`
* **Target Users:** Loan Officers, Real Estate Agents, CRM Administrators, Lead Operations Specialists
* **Primary Objective:** Convert spatial map intelligence and geographic census tract data into actionable CRM prospect records.

---

### ⚙️ Core Functionality

1. **Spatial & Contact Data Pairing:**
   * Binds buyer contact information (**Prospect Full Name** & **Email Address**) with spatial map locations (**Latitude/Longitude Coordinates** and auto-resolved **FFIEC Census Tract ID**).

2. **Automated Lead Sync Workflow:**
   * Triggers real-time pipeline task execution: `Webhook Fired` & `CRM Row Appended`.
   * Transmits lead payloads to the backend `/api/geosphere-lead-sync` server synchronization endpoint.

3. **Live CRM Dashboard Logging:**
   * Instantly appends captured prospect records to the **Live CRM Administrative Dashboard** table at the bottom of the workspace.
   * Maintains real-time tracking badge status (`Synced`), assigned Census Tract ID, and automated task execution logs.

---

### 📋 How to Utilize (Step-by-Step Guide)

#### Step 1: Capture Target Location on Map
* Click on any point, listing pin, or area on the interactive map canvas (or perform an address/city/county search).
* The **Target Coordinates (Lat, Lng)** and **Captured Census Tract ID** fields will auto-populate in the `LEAD INTAKE CAPTURE` panel.

#### Step 2: Input Prospect Contact Information
* Enter the buyer prospect's **Full Name** (e.g., *John Doe*).
* Enter their **Email Address** (e.g., *john@enterprise.com*).

#### Step 3: Trigger Automation
* Click the **Automate CRM Pipeline** button.
* A success notification will confirm lead intake: `🚀 Lead captured for [Prospect Name]! We'll send you active listings in this area within 24 hours.`

#### Step 4: Verify Live Pipeline Activity
* Scroll down or expand the **Live CRM Administrative Dashboard / Automated Task Logs** drawer at the bottom of the map.
* Review the newly generated prospect entry, assigned FFIEC Census Tract ID, task execution badges, and synchronization status.

---

### 💡 Operational Best Practices & Tips
* **Census Tract Resolution:** Ensure a location on the map is clicked or searched prior to submission so the FFIEC Census Tract ID is properly resolved for LMI / CRA compliance tracking.
* **Real-Time Data Refresh:** Capturing a lead automatically updates the live lead counter and table logs without requiring a page refresh.
* **Integrations:** Synchronized lead payloads can be routed to enterprise CRM webhooks (HubSpot, Salesforce, Total Expert, Encompass) via `/api/geosphere-lead-sync`.

---
*GeoSphere Engine — Training Deck Reference Card v1.1*
