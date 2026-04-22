// SIM DATABASE API - USING YOUR CAPTURED SITE ONLY
// Developer: WASIF ALI | Telegram: @FREEHACKS95

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { search } = req.query;

  if (!search) {
    return res.status(200).json({
      status: true,
      message: "SIM Database API",
      usage: "/api?search=03007058868",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    const cleanSearch = search.replace(/\s/g, '');
    
    // Detect type
    let searchType = "mobile";
    let formattedSearch = cleanSearch;
    
    if (/^03[0-9]{9}$/.test(cleanSearch)) {
      searchType = "mobile";
    } 
    else if (/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cleanSearch) || /^[0-9]{13}$/.test(cleanSearch)) {
      searchType = "cnic";
      if (/^[0-9]{13}$/.test(cleanSearch)) {
        formattedSearch = `${cleanSearch.slice(0,5)}-${cleanSearch.slice(5,12)}-${cleanSearch.slice(12)}`;
      }
    }

    // EXACT same request as your capture
    const apiUrl = `https://simlivetracker.com.pk/api.php?search=${encodeURIComponent(formattedSearch)}&type=${searchType}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://simlivetracker.com.pk/",
        "DNT": "1"
      }
    });

    const html = await response.text();
    
    // Parse HTML to JSON
    let result = {};
    
    if (searchType === "mobile") {
      // Extract data using regex
      const nameMatch = html.match(/Name[:\s]*([^<\n]+)/i);
      const mobileMatch = html.match(/Mobile[:\s]*([0-9]{11})/i);
      const cnicMatch = html.match(/CNIC[:\s]*([0-9-]{13,15})/i);
      const addressMatch = html.match(/Address[:\s]*([^<\n]+)/i);
      
      if (nameMatch) result.name = nameMatch[1].trim();
      if (mobileMatch) result.mobile = mobileMatch[1];
      if (cnicMatch) result.cnic = cnicMatch[1];
      if (addressMatch) result.address = addressMatch[1].trim();
      
      // Network detection
      if (result.mobile) {
        const prefix = parseInt(result.mobile.substring(0, 4));
        if (prefix >= 301 && prefix <= 329) result.network = "Jazz";
        else if (prefix >= 310 && prefix <= 319) result.network = "Zong";
        else if (prefix >= 330 && prefix <= 339) result.network = "Ufone";
        else if (prefix >= 340 && prefix <= 359) result.network = "Telenor";
        else result.network = "Unknown";
      }
    } 
    else {
      // CNIC search - multiple records
      const records = [];
      const pattern = /([0-9]{11}).*?([A-Za-z\s]+).*?([0-9-]{13,15})/gi;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const mobile = match[1].trim();
        const name = match[2].trim();
        const cnicVal = match[3].trim();
        
        let network = "Unknown";
        const prefix = parseInt(mobile.substring(0, 4));
        if (prefix >= 301 && prefix <= 329) network = "Jazz";
        else if (prefix >= 310 && prefix <= 319) network = "Zong";
        else if (prefix >= 330 && prefix <= 339) network = "Ufone";
        else if (prefix >= 340 && prefix <= 359) network = "Telenor";
        
        records.push({ name, mobile, cnic: cnicVal, network });
      }
      
      result = {
        cnic: formattedSearch,
        total_sims: records.length,
        records: records
      };
    }

    if (Object.keys(result).length === 0) {
      return res.status(404).json({
        status: false,
        message: "No data found",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    return res.status(200).json({
      status: true,
      data: result,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }
}
