// SIM DATABASE API - ONLY /api?search= ENDPOINT
// Developer: WASIF ALI | Telegram: @FREEHACKS95

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { search } = req.query;

  // If no search parameter
  if (!search) {
    return res.status(400).json({
      status: false,
      message: "Search parameter is required. Use: /api?search=03007058868",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    // Clean search input
    const searchClean = search.replace(/\s/g, '');
    
    // Detect search type
    let searchType = "mobile";
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
    
    // Parse HTML to JSON (simple regex)
    const result = {};
    
    if (searchType === "mobile") {
      // Extract name
      const nameMatch = html.match(/Name[:\s]*([^<\n]+)/i);
      if (nameMatch) result.name = nameMatch[1].trim();
      
      // Extract mobile
      const mobileMatch = html.match(/Mobile[:\s]*([0-9]{11})/i);
      if (mobileMatch) result.mobile = mobileMatch[1];
      
      // Extract CNIC
      const cnicMatch = html.match(/CNIC[:\s]*([0-9-]{13,15})/i);
      if (cnicMatch) result.cnic = cnicMatch[1];
      
      // Extract address
      const addressMatch = html.match(/Address[:\s]*([^<\n]+)/i);
      if (addressMatch) result.address = addressMatch[1].trim();
      
      // Detect network
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
      // CNIC search - extract records
      const records = [];
      const pattern = /([0-9]{11}).*?([A-Za-z\s]+).*?([0-9-]{13,15})/gi;
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const mobile = match[1].trim();
        const name = match[2].trim();
        const cnicVal = match[3].trim();
        
        // Detect network
        let network = "Unknown";
        const prefix = parseInt(mobile.substring(0, 4));
        if (prefix >= 301 && prefix <= 329) network = "Jazz";
        else if (prefix >= 310 && prefix <= 319) network = "Zong";
        else if (prefix >= 330 && prefix <= 339) network = "Ufone";
        else if (prefix >= 340 && prefix <= 359) network = "Telenor";
        
        records.push({ name, mobile, cnic: cnicVal, network });
      }
      
      result.cnic = formattedSearch;
      result.total_sims = records.length;
      result.records = records;
    }

    if (Object.keys(result).length === 0) {
      return res.status(404).json({
        status: false,
        message: "No data found",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Final response
    return res.status(200).json({
      status: true,
      data: result,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });

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
