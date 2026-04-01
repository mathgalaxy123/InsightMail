# 🧾 InsightMail  
## 📊 From Raw Data to Smart Reports — Automatically  

<p align="center">
  <img src="https://img.shields.io/badge/Backend-SpringBoot-green?style=for-the-badge&logo=springboot">
  <img src="https://img.shields.io/badge/Frontend-JS%20%7C%20HTML%20%7C%20CSS-blue?style=for-the-badge&logo=javascript">
  <img src="https://img.shields.io/badge/Database-MySQL-orange?style=for-the-badge&logo=mysql">
  <img src="https://img.shields.io/badge/PDF-iText-red?style=for-the-badge">
  <img src="https://img.shields.io/badge/Email-JavaMail-yellow?style=for-the-badge">
</p>

---

## 🚀 Overview  

InsightMail is a full-stack web application that transforms raw CSV data into **interactive charts** and **professional PDF reports**, and automatically sends them via email — saving time and effort.

---

## ✨ Key Features  

- 📂 Upload CSV and preview data instantly  
- 📊 Visualize Data with Bar, Pie & Line charts (Chart.js)  
- 📄 Generate PDF Reports (iText - Java)  
- 📧 Email Reports Automatically (JavaMail + SMTP)  
- 🗂️ Track Report History with timestamps  
- 🔐 User Authentication (Login & Signup)  

---

## 🖼️ Demo Preview  

*(Add your screenshots or GIFs here for better impact)*  

> 📌 Tip: Use tools like ScreenToGif or OBS to create a demo GIF  

---

## 🛠️ Tech Stack  

| Layer        | Technology                |
|-------------|--------------------------|
| 🌐 Frontend  | HTML, CSS, JavaScript     |
| 📊 Charts    | Chart.js                  |
| ⚙️ Backend   | Java, Spring Boot         |
| 📄 PDF       | iText                     |
| 📧 Email     | JavaMail API + SMTP       |
| 🗄️ Database  | MySQL                     |

---

## 📂 Project Structure  
InsightMail/
├── frontend/ # UI (HTML, CSS, JS)

├── backend/ # Spring Boot APIs

├── database/ # MySQL schema

└── README.md


---

## ⚙️ Setup & Installation  

### 🔧 Prerequisites  

- Java JDK 17+  
- Maven  
- MySQL  
- VS Code / IntelliJ  

---

### ▶️ Run Locally  

```bash
# Clone the repository
git clone https://github.com/your-username/InsightMail.git

# Navigate to backend
cd InsightMail/backend

# Run Spring Boot server
mvn spring-boot:run
```

👉 Then open:
frontend/index.html in your browser

## 📧 How It Works

1. Upload a CSV file through the UI.  
2. Backend parses and validates the data.  
3. Charts (bar, pie, line) are generated using Chart.js.  
4. iText converts charts and data into a styled PDF report.  
5. JavaMail sends the report automatically through SMTP.  
6. Every report and email event is saved in the database.

| Name                 | Role                 |
| -------------------- | -------------------- |
| 👩‍💻 Anupriya Gupta | Full Stack Developer |
| 👨‍💻 Bipin Yashasvi | Full Stack Developer |

🌟 Future Enhancements

1. 📈 Advanced analytics (AI insights)

2. ☁️ Cloud deployment (AWS/Docker)

3. 📊 More chart customization

4. 📱 Mobile responsiveness

<img src="[img.shields.io](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=githubactions)">
<img src="[img.shields.io](https://img.shields.io/badge/Contributions-Welcome-blueviolet?style=for-the-badge)">

## 📜 License

This project was developed as part of a college submission.  
You are free to explore, reference, or build upon it for learning purposes.


