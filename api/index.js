// SIM DATABASE API - /api/?search= ENDPOINT
// Developer: WASIF ALI | Telegram: @FREEHACKS95

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { search } = req.query;

  // If no search parameter
  if (!search) {
    return res.status(200).json({
      success: false,
      message: "Please provide a search query",
      usage: "/api/?search=03007058868 or /api/?search=4220126114842",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    const cleanSearch = search.trim();
    
    // Validation
    const isMobile = /^03[0-9]{9}$/.test(cleanSearch);
    const isCNIC = /^[0-9]{13}$/.test(cleanSearch) || /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cleanSearch);
    
    if (!isMobile && !isCNIC) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Use mobile (03007058868) or CNIC (4220126114842)",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Format search for APIs
    let formattedForFakcloud = cleanSearch;
    let formattedForSims = cleanSearch;
    let isCNICSearch = false;
    
    if (isMobile) {
      formattedForFakcloud = cleanSearch.substring(1);
      formattedForSims = '92' + cleanSearch.substring(1);
    } else {
      isCNICSearch = true;
      const plainCNIC = cleanSearch.replace(/-/g, '');
      formattedForFakcloud = plainCNIC;
      formattedForSims = `${plainCNIC.slice(0,5)}-${plainCNIC.slice(5,12)}-${plainCNIC.slice(12)}`;
    }

    // Backend URLs
    const BACKENDS = [
      `https://sim-api.fakcloud.tech/?q=${encodeURIComponent(formattedForFakcloud)}`,
      `https://simsownersdetails.net.pk/sd-lookup.php?number=${encodeURIComponent(formattedForSims)}`
    ];

    let records = null;

    // Try both backends
    for (const backendUrl of BACKENDS) {
      try {
        const response = await fetch(backendUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
            "Accept": "application/json"
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.success === true && result.data && result.data.records) {
            records = result.data.records;
            break;
          }
          else if (Array.isArray(result) && result.length > 0) {
            records = result;
            break;
          }
          else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            records = result.data;
            break;
          }
        }
      } catch(e) {
        continue;
      }
    }

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Format records
    const formattedRecords = records.map(record => ({
      name: record.full_name || record.Name || record.name,
      mobile: record.phone || record.Mobile || record.mobile,
      cnic: record.cnic || record.CNIC,
      address: record.address || record.ADDRESS,
      network: detectNetwork(record.phone || record.Mobile || record.mobile)
    }));

    // Mobile search (single record)
    if (!isCNICSearch && formattedRecords.length === 1) {
      const r = formattedRecords[0];
      return res.status(200).json({
        success: true,
        name: r.name,
        mobile: r.mobile,
        cnic: r.cnic,
        address: r.address,
        network: r.network,
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // CNIC search (multiple records)
    return res.status(200).json({
      success: true,
      total_sims: formattedRecords.length,
      records: formattedRecords,
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Service temporarily unavailable",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }
}

function detectNetwork(mobile) {
  if (!mobile) return "Unknown";
  const cleanMobile = mobile.toString().replace(/\D/g, '');
  const prefix = parseInt(cleanMobile.substring(0, 4));
  if ((prefix >= 301 && prefix <= 329) || prefix === 300) return "Jazz";
  if (prefix >= 310 && prefix <= 319) return "Zong";
  if (prefix >= 330 && prefix <= 339) return "Ufone";
  if (prefix >= 340 && prefix <= 359) return "Telenor";
  return "Unknown";
}
