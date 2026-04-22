// SIM DATABASE API - EXACT HTML PARSING
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

    const apiUrl = `https://simlivetracker.com.pk/api.php?search=${encodeURIComponent(formattedSearch)}&type=${searchType}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "Accept": "*/*",
        "Referer": "https://simlivetracker.com.pk/",
        "DNT": "1"
      }
    });

    const html = await response.text();
    
    // ========== ACCURATE PARSING ==========
    let result = {};
    
    if (searchType === "mobile") {
      // Method 1: Look for table data
      const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableHtml = tableMatch[1];
        
        // Extract name
        const nameMatch = tableHtml.match(/Name<\/td>\s*<td[^>]*>([^<]+)/i);
        if (nameMatch) result.name = nameMatch[1].trim();
        
        // Extract mobile
        const mobileMatch = tableHtml.match(/Mobile<\/td>\s*<td[^>]*>([^<]+)/i);
        if (mobileMatch) result.mobile = mobileMatch[1].trim();
        else result.mobile = cleanSearch;
        
        // Extract CNIC
        const cnicMatch = tableHtml.match(/CNIC<\/td>\s*<td[^>]*>([^<]+)/i);
        if (cnicMatch) result.cnic = cnicMatch[1].trim();
        
        // Extract address
        const addressMatch = tableHtml.match(/Address<\/td>\s*<td[^>]*>([^<]+)/i);
        if (addressMatch) result.address = addressMatch[1].trim();
      }
      
      // Method 2: Direct regex fallback
      if (!result.name) {
        const nameRegex = /Name<\/td>\s*<td[^>]*>([^<]+)/i;
        const nameMatch = html.match(nameRegex);
        if (nameMatch) result.name = nameMatch[1].trim();
      }
      
      if (!result.cnic) {
        const cnicRegex = /CNIC<\/td>\s*<td[^>]*>([^<]+)/i;
        const cnicMatch = html.match(cnicRegex);
        if (cnicMatch) result.cnic = cnicMatch[1].trim();
      }
      
      if (!result.address) {
        const addrRegex = /Address<\/td>\s*<td[^>]*>([^<]+)/i;
        const addrMatch = html.match(addrRegex);
        if (addrMatch) result.address = addrMatch[1].trim();
      }
      
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
      // CNIC search - extract all records
      const records = [];
      
      // Find all rows in the table
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      
      while ((rowMatch = rowPattern.exec(html)) !== null) {
        const rowHtml = rowMatch[1];
        
        // Skip header row
        if (rowHtml.includes('<th')) continue;
        
        // Extract columns
        const cols = [];
        const colPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let colMatch;
        
        while ((colMatch = colPattern.exec(rowHtml)) !== null) {
          cols.push(colMatch[1].trim());
        }
        
        if (cols.length >= 3) {
          const mobile = cols[0].replace(/[^0-9]/g, '');
          const name = cols[1];
          const cnic = cols[2];
          
          if (mobile && mobile.length === 11) {
            let network = "Unknown";
            const prefix = parseInt(mobile.substring(0, 4));
            if (prefix >= 301 && prefix <= 329) network = "Jazz";
            else if (prefix >= 310 && prefix <= 319) network = "Zong";
            else if (prefix >= 330 && prefix <= 339) network = "Ufone";
            else if (prefix >= 340 && prefix <= 359) network = "Telenor";
            
            records.push({ name, mobile, cnic, network });
          }
        }
      }
      
      result = {
        cnic: formattedSearch,
        total_sims: records.length,
        records: records
      };
    }

    if (Object.keys(result).length === 0 || (searchType === "mobile" && !result.name && !result.cnic)) {
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
