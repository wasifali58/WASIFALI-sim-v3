// SIM DATABASE API - POWERFUL (DUAL BACKEND)
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
      usage: "/api/?search=03007058868 or /api/?search=3630109586747",
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
        message: "Invalid format. Use mobile (03249560718) or CNIC (3630109586747)",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    let formattedForSims = cleanSearch;
    let formattedForFak = cleanSearch;
    let isCNICSearch = false;
    
    if (isMobile) {
      formattedForSims = '92' + cleanSearch.substring(1);
      formattedForFak = cleanSearch.substring(1);
    } else {
      isCNICSearch = true;
      const plainCNIC = cleanSearch.replace(/-/g, '');
      formattedForSims = `${plainCNIC.slice(0,5)}-${plainCNIC.slice(5,12)}-${plainCNIC.slice(12)}`;
      formattedForFak = plainCNIC;
    }

    const SIMS_URL = `https://simsownersdetails.net.pk/sd-lookup.php?number=${encodeURIComponent(formattedForSims)}`;
    const FAK_URL = `https://sim-api.fakcloud.tech/?q=${encodeURIComponent(formattedForFak)}`;

    const SIMS_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "Accept": "application/json",
      "Referer": "https://simsownersdetails.net.pk/cnic-information/",
      "DNT": "1"
    };

    const FAK_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      "Accept": "application/json"
    };

    const [simsRes, fakRes] = await Promise.allSettled([
      fetch(SIMS_URL, { headers: SIMS_HEADERS }),
      fetch(FAK_URL, { headers: FAK_HEADERS })
    ]);

    let allRecords = [];
    let simsData = null;
    let fakData = null;

    if (simsRes.status === 'fulfilled' && simsRes.value.ok) {
      try {
        const data = await simsRes.value.json();
        if (Array.isArray(data) && data.length > 0) {
          simsData = data.filter(r => r.Name && r.Name !== '***************' && r.Name !== 'Hidden');
        } else if (data && data.Name && data.Name !== '***************') {
          simsData = [data];
        }
      } catch(e) {}
    }

    if (fakRes.status === 'fulfilled' && fakRes.value.ok) {
      try {
        const data = await fakRes.value.json();
        if (data.success === true && data.data && data.data.records) {
          fakData = data.data.records.filter(r => r.full_name && r.full_name !== '***************');
        }
      } catch(e) {}
    }

    const mobileMap = new Map();
    
    if (simsData) {
      simsData.forEach(record => {
        let mobile = record.Mobile || record.mobile;
        if (mobile && mobile.startsWith('92')) {
          mobile = '0' + mobile.substring(2);
        }
        if (mobile) {
          mobileMap.set(mobile, {
            name: record.Name || record.name,
            mobile: mobile,
            cnic: record.CNIC || record.cnic,
            address: record.ADDRESS || record.address,
            network: detectNetwork(mobile)
          });
        }
      });
    }

    if (fakData) {
      fakData.forEach(record => {
        let mobile = record.phone || record.mobile;
        if (mobile && mobile.startsWith('92')) {
          mobile = '0' + mobile.substring(2);
        }
        if (mobile && !mobileMap.has(mobile)) {
          mobileMap.set(mobile, {
            name: record.full_name || record.name,
            mobile: mobile,
            cnic: record.cnic,
            address: record.address,
            network: detectNetwork(mobile)
          });
        }
      });
    }

    allRecords = Array.from(mobileMap.values());

    // NO RECORD FOUND - Clean message
    if (allRecords.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No record found",
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Single record (mobile search)
    if (!isCNICSearch && allRecords.length === 1) {
      const r = allRecords[0];
      return res.status(200).json({
        success: true,
        name: r.name,
        mobile: r.mobile,
        cnic: r.cnic || "Not available",
        address: r.address || "Not available",
        network: r.network,
        developer: "WASIF ALI",
        telegram: "@FREEHACKS95"
      });
    }

    // Multiple records (CNIC search)
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
  
  if ((prefix >= 300 && prefix <= 309) || (prefix >= 320 && prefix <= 329)) {
    return "Jazz";
  }
  if (prefix >= 310 && prefix <= 319) {
    return "Zong";
  }
  if (prefix >= 330 && prefix <= 339) {
    return "Ufone";
  }
  if ((prefix >= 340 && prefix <= 349) || (prefix >= 350 && prefix <= 359)) {
    return "Telenor";
  }
  
  return "Unknown";
}
