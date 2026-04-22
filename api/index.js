// SIM DATABASE API - COMPLETE WORKING
// Developer: WASIF ALI | Telegram: @FREEHACKS95

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { search } = req.query;

  if (!search) {
    return res.status(200).json({
      success: false,
      message: "Please provide a search query",
      usage: "/api/?search=03xxxxxxxxx or /api/?search=xxxxx-xxxxxxx-x",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    const cleanSearch = search.trim();
    
    const isMobile = /^03[0-9]{9}$/.test(cleanSearch);
    const isCNIC = /^[0-9]{13}$/.test(cleanSearch) || /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cleanSearch);
    
    if (!isMobile && !isCNIC) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Use mobile (03xxxxxxxxx) or CNIC (xxxxx-xxxxxxx-x)",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    let targetCNIC = null;
    const uniqueRecords = new Map();

    // STEP 1: Get CNIC from mobile number (if mobile search)
    if (isMobile) {
      const formattedMobile = '92' + cleanSearch.substring(1);
      const simsUrl = `https://simsownersdetails.net.pk/sd-lookup.php?number=${encodeURIComponent(formattedMobile)}`;
      
      const simsRes = await fetch(simsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://simsownersdetails.net.pk/cnic-information/",
          "DNT": "1"
        }
      });

      if (simsRes.ok) {
        const data = await simsRes.json();
        if (Array.isArray(data) && data.length > 0 && data[0].CNIC) {
          targetCNIC = data[0].CNIC;
        } else if (data && data.CNIC) {
          targetCNIC = data.CNIC;
        }
      }
    } 
    // STEP 2: Format CNIC directly
    else {
      const plainCNIC = cleanSearch.replace(/-/g, '');
      if (plainCNIC.length === 13) {
        targetCNIC = `${plainCNIC.slice(0,5)}-${plainCNIC.slice(5,12)}-${plainCNIC.slice(12)}`;
      }
    }

    // STEP 3: If CNIC found, fetch all SIMs
    if (targetCNIC) {
      const simsUrl = `https://simsownersdetails.net.pk/sd-lookup.php?number=${encodeURIComponent(targetCNIC)}`;
      
      const simsRes = await fetch(simsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://simsownersdetails.net.pk/cnic-information/",
          "DNT": "1"
        }
      });

      if (simsRes.ok) {
        const data = await simsRes.json();
        let records = [];
        
        if (Array.isArray(data) && data.length > 0) {
          records = data.filter(r => r.Name && r.Name !== '***************' && r.Name !== 'Hidden');
        } else if (data && data.Name && data.Name !== '***************') {
          records = [data];
        }
        
        // Remove duplicates by mobile number
        records.forEach(record => {
          let mobile = record.Mobile || record.mobile;
          if (mobile && mobile.startsWith('92')) {
            mobile = '0' + mobile.substring(2);
          }
          if (mobile && mobile.length === 10 && mobile.startsWith('3')) {
            mobile = '0' + mobile;
          }
          
          const cleanMobile = mobile ? mobile.replace(/\D/g, '').slice(-11) : null;
          
          if (cleanMobile && cleanMobile.length === 11 && !uniqueRecords.has(cleanMobile)) {
            uniqueRecords.set(cleanMobile, {
              name: record.Name || record.name,
              mobile: mobile,
              cnic: record.CNIC || record.cnic,
              address: (record.ADDRESS || record.address || "").substring(0, 200),
              network: detectNetwork(mobile)
            });
          }
        });
      }
    }

    const allRecords = Array.from(uniqueRecords.values());

    if (allRecords.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No record found",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    return res.status(200).json({
      success: true,
      total_sims: allRecords.length,
      records: allRecords,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "No record found",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }
}

function detectNetwork(mobile) {
  if (!mobile) return "Unknown";
  
  let cleanMobile = mobile.toString().replace(/\D/g, '');
  
  if (cleanMobile.startsWith('92')) {
    cleanMobile = '0' + cleanMobile.substring(2);
  }
  if (cleanMobile.length === 10 && cleanMobile.startsWith('3')) {
    cleanMobile = '0' + cleanMobile;
  }
  if (cleanMobile.length < 4) return "Unknown";
  
  const prefix = parseInt(cleanMobile.substring(0, 4));
  
  if ((prefix >= 300 && prefix <= 309) || (prefix >= 320 && prefix <= 329)) return "Jazz";
  if (prefix >= 310 && prefix <= 319) return "Zong";
  if (prefix >= 330 && prefix <= 339) return "Ufone";
  if ((prefix >= 340 && prefix <= 349) || (prefix >= 350 && prefix <= 359)) return "Telenor";
  
  return "Unknown";
}
