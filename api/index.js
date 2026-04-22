// SIM DATABASE API - COMPLETE FEATURES
// Developer: WASIF ALI
// Telegram: @FREEHACKS95

import { parse } from 'node-html-parser';

// Network detection function
function detectNetwork(mobile) {
  if (!mobile || mobile.length < 4) return "Unknown";
  try {
    const prefix = parseInt(mobile.substring(0, 4));
    if (prefix >= 301 && prefix <= 329) return "Jazz";
    if (prefix >= 310 && prefix <= 319) return "Zong";
    if (prefix >= 330 && prefix <= 339) return "Ufone";
    if (prefix >= 340 && prefix <= 359) return "Telenor";
    return "Unknown";
  } catch (e) {
    return "Unknown";
  }
}

// HTML to JSON parser
function parseHtmlToJson(html, search, searchType) {
  const root = parse(html);
  const text = html;

  if (searchType === "mobile") {
    // Extract single record
    const result = {};
    
    // Extract mobile number
    const mobileMatch = text.match(/Mobile[:\s]*([0-9]{11})/i);
    if (mobileMatch) {
      const mobileNum = mobileMatch[1];
      result.mobile = mobileNum;
      result.network = detectNetwork(mobileNum);
    }
    
    // Extract name
    const nameMatch = text.match(/Name[:\s]*([^<\n]+)/i);
    if (nameMatch) result.name = nameMatch[1].trim();
    
    // Extract CNIC
    const cnicMatch = text.match(/CNIC[:\s]*([0-9-]{13,15})/i);
    if (cnicMatch) result.cnic = cnicMatch[1];
    
    // Extract address
    const addressMatch = text.match(/Address[:\s]*([^<\n]+)/i);
    if (addressMatch) result.address = addressMatch[1].trim();
    
    return result;
  } 
  else {
    // CNIC search - multiple records
    const records = [];
    
    // Try table format
    const rows = root.querySelectorAll('tr');
    for (const row of rows) {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 3) {
        const mobile = cols[0]?.text?.trim() || '';
        const name = cols[1]?.text?.trim() || '';
        const cnicVal = cols[2]?.text?.trim() || '';
        const addressVal = cols[3]?.text?.trim() || '';
        
        if (mobile && /^03[0-9]{9}$/.test(mobile)) {
          records.push({
            name: name,
            mobile: mobile,
            cnic: cnicVal,
            network: detectNetwork(mobile),
            address: addressVal
          });
        }
      }
    }
    
    // If no table, try regex
    if (records.length === 0) {
      const pattern = /([0-9]{11}).*?([A-Za-z\s]+).*?([0-9-]{13,15})/gi;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const mobile = match[1].trim();
        const name = match[2].trim();
        const cnicVal = match[3].trim();
        if (mobile && /^03[0-9]{9}$/.test(mobile)) {
          records.push({
            name: name,
            mobile: mobile,
            cnic: cnicVal,
            network: detectNetwork(mobile)
          });
        }
      }
    }
    
    return {
      cnic: search,
      total_sims: records.length,
      records: records
    };
  }
}

// Main handler for Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { search } = req.query;

  // Root endpoint - API info
  if (req.method === 'GET' && !search) {
    return res.status(200).json({
      status: "active",
      service: "SIM Database Tracker",
      endpoints: {
        mobile: "/api?search=03007058868",
        cnic: "/api?search=35201-1234567-8"
      },
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  // Validate search parameter
  if (!search) {
    return res.status(400).json({
      status: false,
      message: "Search parameter is required",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  // Clean search input
  const searchClean = search.replace(/\s/g, '');
  
  // Detect search type
  let searchType = null;
  let formattedSearch = searchClean;
  
  if (/^03[0-9]{9}$/.test(searchClean)) {
    searchType = "mobile";
  } 
  else if (/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(searchClean) || /^[0-9]{13}$/.test(searchClean)) {
    searchType = "cnic";
    if (/^[0-9]{13}$/.test(searchClean)) {
      formattedSearch = `${searchClean.slice(0,5)}-${searchClean.slice(5,12)}-${searchClean.slice(12)}`;
    }
  } 
  else {
    return res.status(400).json({
      status: false,
      message: "Invalid format. Use mobile (03xxxxxxxxx) or CNIC (xxxxx-xxxxxxx-x)",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    // Call the external API
    const apiUrl = `https://simlivetracker.com.pk/api.php?search=${encodeURIComponent(formattedSearch)}&type=${searchType}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "Accept": "*/*",
        "Referer": "https://simlivetracker.com.pk/",
        "DNT": "1"
      }
    });

    if (response.status !== 200) {
      throw new Error(`API returned ${response.status}`);
    }

    const html = await response.text();
    
    // Parse HTML to JSON
    const parsedData = parseHtmlToJson(html, formattedSearch, searchType);
    
    if (!parsedData || (searchType === "mobile" && Object.keys(parsedData).length === 0)) {
      return res.status(404).json({
        status: false,
        message: "No data found for this number",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Build response
    const responseData = {
      status: true,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    };

    if (searchType === "mobile") {
      if (parsedData.name) responseData.name = parsedData.name;
      if (parsedData.mobile) responseData.mobile = parsedData.mobile;
      if (parsedData.cnic) responseData.cnic = parsedData.cnic;
      if (parsedData.network) responseData.network = parsedData.network;
      if (parsedData.address) responseData.address = parsedData.address;
    } else {
      if (parsedData.cnic) responseData.cnic = parsedData.cnic;
      if (parsedData.total_sims !== undefined) responseData.total_sims = parsedData.total_sims;
      if (parsedData.records) responseData.records = parsedData.records;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Service temporarily unavailable",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }
}
