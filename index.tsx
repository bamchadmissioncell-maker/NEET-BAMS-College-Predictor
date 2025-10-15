import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { GoogleGenAI, Type } from "@google/genai";

interface College {
  name: string;
  city: string;
  cutoffRange: string;
  description: string;
  logoUrl: string;
  website?: string;
}

const PlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="placeholder-svg">
    <path d="M3 21h18"></path>
    <path d="M5 21V5l2-2h10l2 2v16"></path>
    <path d="M9 21v-8l6 4v4"></path>
    <path d="M9 10H8"></path>
    <path d="M16 10h-1"></path>
    <path d="M12 10h-1"></path>
    <path d="M12 6h-1"></path>
    <path d="M16 6h-1"></path>
    <path d="M9 6H8"></path>
  </svg>
);

const App = () => {
  const [score, setScore] = useState("");
  const [category, setCategory] = useState("General");
  const [state, setState] = useState("Maharashtra");
  const [mobile, setMobile] = useState("");
  const [result, setResult] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = ["General", "OBC", "SC", "ST", "EWS", "General-PWD", "OBC-PWD", "SC-PWD", "ST-PWD", "EWS-PWD"];
  const states = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
    "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
    "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];
  const examples = [
    { score: '580', category: 'OBC', state: 'Uttar Pradesh' },
    { score: '450', category: 'SC', state: 'Rajasthan' },
    { score: '620', category: 'General', state: 'Maharashtra' },
    { score: '350', category: 'ST', state: 'Madhya Pradesh' },
  ];

  const saveDataToSheet = async () => {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      console.warn("Google Apps Script URL is not configured. Skipping data save.");
      return;
    }

    try {
      await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ score, category, state, mobile }),
      });
    } catch (err) {
      console.error("Failed to save data to Google Sheet:", err);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!score) {
      setError("Please enter your NEET score.");
      return;
    }
    const scoreNum = Number(score);
    if (isNaN(scoreNum) || !Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 720) {
      setError("Please enter a valid NEET score between 0 and 720.");
      return;
    }
    const mobileRegex = /^\d{10}$/;
    if (!mobile || !mobileRegex.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    
    setResult([]);
    setLoading(true);

    let prompt = `My NEET score is ${score}, my category is ${category}, and my state is ${state}. Find BAMS colleges in that state with an expected cutoff lower than my score for my category. For each college, provide its name, city, expected cutoff score range, a 1-2 sentence description (highlighting unique features, location, or affiliations), a publicly accessible URL for its logo, and the official college website URL. If a logo URL is not available, return the string 'NO_LOGO'. If a website is not available, return an empty string for the website field.`;
    
    if (scoreNum > 200) {
      prompt += " Additionally, please ensure 'Bapu Ayurvedic Medical College evam Hospital Kopaganj Mau' is included in the results list. Provide all its required details (city, cutoffRange, description, logoUrl, website) as a special recommendation, regardless of its state or exact cutoff.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                city: { type: Type.STRING },
                cutoffRange: { type: Type.STRING },
                description: { type: Type.STRING },
                logoUrl: { type: Type.STRING },
                website: { type: Type.STRING },
              },
              required: ["name", "city", "cutoffRange", "description", "logoUrl", "website"],
            },
          },
        },
      });
      const colleges = JSON.parse(response.text);
      setResult(colleges);
       if (colleges.length === 0) {
        setError("No colleges found matching your criteria. Try adjusting your score or filters.");
      } else {
        await saveDataToSheet();
      }
    } catch (err) {
      console.error("API Error or JSON Parsing Error:", err);
      setError("Sorry, something went wrong while fetching predictions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: { score: string; category: string; state: string; }) => {
    setScore(example.score);
    setCategory(example.category);
    setState(example.state);
  };
  
  const PredictorView = () => (
    <>
      <h1>NEET BAMS College Predictor</h1>
      <p className="subtitle">Enter your details to find potential BAMS colleges.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="score">NEET Score (out of 720)</label>
          <input
            id="score"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g., 550"
            aria-label="NEET Score"
            required
          />
        </div>
         <div className="form-group">
          <label htmlFor="mobile">Mobile Number</label>
          <input
            id="mobile"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="e.g., 9876543210"
            aria-label="Mobile Number"
            maxLength={10}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Your Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Your Category"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="state">Your State</label>
          <select
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label="Your State"
          >
            {states.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="predict-button" disabled={loading}>
          {loading && <span className="loader"></span>}
          {loading ? "Predicting..." : "Predict Colleges"}
        </button>
      </form>

      <div className="results-area">
        {loading && (
          <div className="loading-container">
            <div className="main-loader"></div>
            <p>Finding the best colleges for you...</p>
          </div>
        )}

        {!loading && error && <p className="error-message">{error}</p>}

        {!loading && result.length > 0 && (
          <div className="results">
            <h2>Potential Colleges</h2>
            <div className="college-list">
              {result.map((college, index) => {
                const CardComponent = college.website ? 'a' : 'div';
                const props = {
                  href: college.website || undefined,
                  target: college.website ? "_blank" : undefined,
                  rel: college.website ? "noopener noreferrer" : undefined,
                  className: `college-card ${college.website ? 'clickable' : ''}`,
                  style: { animationDelay: `${index * 100}ms` },
                };
                
                return (
                  <CardComponent key={index} {...props}>
                    <div className="college-logo-container">
                      {college.logoUrl && college.logoUrl !== 'NO_LOGO' ? (
                        <img src={college.logoUrl} alt={`${college.name} logo`} className="college-logo" />
                      ) : (
                        <div className="logo-placeholder"><PlaceholderIcon /></div>
                      )}
                    </div>
                    <div className="college-details">
                      <h3>{college.name}</h3>
                      <p className="college-location">{college.city}</p>
                      <p className="college-cutoff"><strong>Cutoff:</strong> {college.cutoffRange}</p>
                      <p className="college-description">{college.description}</p>
                    </div>
                  </CardComponent>
                );
              })}
            </div>
          </div>
        )}
      </div>


      <div className="examples-section">
        <h3>Or try an example...</h3>
        <div className="examples-grid">
          {examples.map((ex, i) => (
            <button key={i} className="example-tag" onClick={() => handleExampleClick(ex)}>
              <span><strong>Score:</strong> {ex.score}</span>
              <span><strong>Category:</strong> {ex.category}</span>
              <span><strong>State:</strong> {ex.state}</span>
            </button>
          ))}
        </div>
      </div>

      <footer className="app-footer">
        <Link to="/about">About This Predictor</Link>
      </footer>
    </>
  );

  const AboutView = () => (
    <div className="about-section">
      <h2>About the Predictor</h2>
      <p>This NEET to BAMS College Predictor is a tool designed to help aspiring medical students estimate which Bachelor of Ayurvedic Medicine and Surgery (BAMS) colleges they might be eligible for based on their NEET score, category, and state.</p>
      
      <h3>How It Works</h3>
      <p>Using Google's powerful Gemini AI, this tool analyzes your input and compares it against a vast dataset of college information and historical admission trends. It provides a list of potential colleges where your chances of admission are favorable.</p>
      
      <h3>Disclaimer</h3>
      <p>The predictions provided are for informational purposes only and are based on AI models and available data. They are not a guarantee of admission. Cutoff scores can vary each year due to factors like the number of applicants, seat availability, and the difficulty of the NEET exam. Always consult official college and counseling authority websites for the most accurate and up-to-date information.</p>

      <Link to="/" className="back-link">Back to Predictor</Link>
    </div>
  );

  return (
    <HashRouter>
      <div className="container">
        <Routes>
          <Route path="/" element={<PredictorView />} />
          <Route path="/about" element={<AboutView />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
