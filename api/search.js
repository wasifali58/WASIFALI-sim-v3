// SIM DATABASE API - DUAL BACKEND (PROXY ALLOWED)
// Developer: WASIF ALI | Telegram: @FREEHACKS95

export default async function handler(req, res) {
  // CORS headers - allow any site to use
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { search } = req.query;

  if (!search) {
    return res.status(400).json({
      success: false,
      message: "Search parameter required. Use: ?search=03007058868",
      developer: "WASIF ALI",
      telegram: "@FREEHACKS95"
    });
  }

  try {
    const cleanSearch = search.replace(/\s/g, '');
    
    // Detect type and format
    let formattedForFakcloud = cleanSearch;
    let formattedForSims = cleanSearch;
    let isCNIC = false;
    
    if (/^03[0-9]{9}$/.test(cleanSearch)) {
      formattedForFakcloud = cleanSearch.substring(1);
      formattedForSims = '92' + cleanSearch.substring(1);
    } 
    else if (/^[0-9]{13}$/.test(cleanSearch)) {
      isCNIC = true;
      formattedForSims = `${cleanSearch.slice(0,5)}-${cleanSearch.slice(5,12)}-${cleanSearch.slice(12)}`;
    }
    else if (/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cleanSearch)) {
      isCNIC = true;
      formattedForFakcloud = cleanSearch.replace(/-/g, '');
      formattedForSims = cleanSearch;
    }

    // Backend URLs (no mention in response)
    const BACKENDS = [
      {
        url: `https://sim-api.fakcloud.tech/?q=${encodeURIComponent(formattedForFakcloud)}`,
        type: 'fakcloud'
      },
      {
        url: `https://simsownersdetails.net.pk/sd-lookup.php?number=${encodeURIComponent(formattedForSims)}`,
        type: 'simsowners'
      }
    ];

    let records = null;
    let source = null;

    // Try both backends
    for (const backend of BACKENDS) {
      try {
        const response = await fetch(backend.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
            "Accept": "application/json"
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          // Handle fakcloud.tech response
          if (backend.type === 'fakcloud' && result.success === true && result.data && result.data.records) {
            records = result.data.records;
            source = 'fakcloud';
            break;
          }
          // Handle simsowners response (array format)
          else if (backend.type === 'simsowners' && Array.isArray(result) && result.length > 0) {
            records = result;
            source = 'simsowners';
            break;
          }
          // Handle simsowners response (object format)
          else if (backend.type === 'simsowners' && result.data && Array.isArray(result.data) && result.data.length > 0) {
            records = result.data;
            source = 'simsowners';
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

    // Format records to consistent structure
    const formattedRecords = records.map(record => ({
      name: record.full_name || record.Name || record.name || "N/A",
      mobile: record.phone || record.Mobile || record.mobile || "N/A",
      cnic: record.cnic || record.CNIC || "N/A",
      address: record.address || record.ADDRESS || "N/A",
      network: detectNetwork(record.phone || record.Mobile || record.mobile)
    }));

    // Single record (mobile search)
    if (!isCNIC && formattedRecords.length === 1) {
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

    // Multiple records (CNIC search)
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
