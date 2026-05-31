const express = require('express');
const router = express.Router();
const Dealer = require('../models/Dealer');

const RAW_DEALERS = [
  // Arvind - FRI
  { name: 'AMBIKA FANCY& HOME APPLIANCES-NAGARAM', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Anand Steel Home Appliances-Yapral', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Ashirwad Enterprises-Sainikpuri', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'BAJRANGBALI STEEL PALACE-Kapra', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'BHAGWATHI SMART INDIAN BAZAR-RAMPALLY', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'BSP KITCHEN WORLD-AS RAO NAGAR', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Chamanlal Steel Palace & Home Appliances -Sainikuri', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Hindustan Metals-Nagaram', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Jai Ambe Home Needs Bazar-Kapra', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Mahalaxmi Markets-Kapra', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Nav Durga Home Appliances-Saket', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'SRI GANESH STEEL PLASTICS-NAGARAM', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Sri Laxmi Ganapathi Home Needs-Dammaiguda', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Sri Sai Home Needs-Kapra', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'SRI VENKATESWARA ELECTRONICS-KAPRA', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'Uma Electronics & Electricals-Yapral', salesTeam: 'Arvind', belt: 'FRI' },
  { name: 'SRI RAMA TRADERS- BOMMARASPET', salesTeam: 'Arvind', belt: 'FRI' },

  // Arvind - MON
  { name: 'B MART-KONDAPUR', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'BALAJI STEEL HOUSE-MANIKONDA', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Dilip Super Market-Alkapur', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Dwaraka Steel Plastic & Home Appliances-Darga', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'JYOTHI STEEL-Manikonda', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Krishna Steel Palace & Home Appliances-Pupalguda', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Krishna Steel Palace-Narsingi', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'KRISHNA STEEL&PLASTIC HOUSE-MANIKONDA', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'NARAYAN STEEL-MANIKONDA', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'OM SAI GURU HOME NEEDS-NARSINGI', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Sri Balaji Steel & Plastic Palace-Manikonda', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'SRII KRISHNA ELECTRONICS & APPLIANCES-LANGER HOUSE', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Srinivasa Home Appliances-Manikonda', salesTeam: 'Arvind', belt: 'MON' },
  { name: 'Vaishnavi Kitchen Appliances-Darga', salesTeam: 'Arvind', belt: 'MON' },

  // Arvind - SAT
  { name: 'ONE STEP STEEL PALACE & HOME APPLIANCES-UPPAL', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'BHAVANI STEEL PALACE-NACHARAM', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'Chamunda Steel House-Uppal', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'JAI SRI STEEL PALACE- MALLAPUR', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'MAHADEV STEEL HOUSE-BODUPPAL', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'MAHALAXMI SHOPPING CENTER-BODUPPAL', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'MAHATHI ENTERPRISES-BODUPPAL', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'Mathaji Steel Palace-Chilka Nagar', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'SAI HOME NEEDS GIFT & NOVELTIES-Mallapur', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'Sri Durga Shopping Centre-Uppal', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'Sri Durga Shopping Centre-Uppal-NON GST', salesTeam: 'Arvind', belt: 'SAT' },
  { name: 'SRI POOJITHA ENTERPRISES-BODUPPAL', salesTeam: 'Arvind', belt: 'SAT' },

  // Arvind - THUR
  { name: 'ANAND\'S COLLECTION', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'ANUTEX SHOPPINGMALL LLP', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Balaji Kitchen Ware -Shapur Nagar', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'BHAGAVATHI STEEL BAZAR-SUCHITRA', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Bhagavathi Steel Palace-Karkhana', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Bhagawati Steel Stores-Malkajgiri', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Bhagwati Steel Palace-Diamond Point', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'BHAVANI STORE-TIRUMALGHERY', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'ECO HOME SOLUTIONS', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'JAGADAMBA STEEL PALACE -MALAKAJGIRI', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'JBS Kitchen World-Malklajgiri', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'KOUSHIKA HOME NEEDS PLASTIC & STEEL-Bhudevi Ngr', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Krishna Steel & Plastic-Malakajgiri', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Laxmi Steel House & Kitchenware-O.B.N Ply', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'MVR JAI BHAGWATHI STEEL PALACE-MALKAJGIRI', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'OM STEEL PALACE-SHAPUR NAGAR', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Ramdev Steel House-Old Bowenpally', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'SAI STEEL PALACE-MALKAJGIRI', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Shree Bhagwathi Steel&Plasticenterprises-Malakajgir', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'SRI BHAVANI STEEL & PLASTIC ENTERPRISES-MALAKAJGIRI', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'SRI RANA STEEL AND GIFT NOVELTIES-MEDCHAL', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'LAXMI STEEL PALACE-CHINTAL', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Laxmi Steel Palace-Suchitra', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Baba Steel-Shapur Nagar', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'Uttam Departmental Stores-Malkajgiri', salesTeam: 'Arvind', belt: 'THUR' },
  { name: 'YASH SV ENTERPRISES-ANAND BAGH', salesTeam: 'Arvind', belt: 'THUR' },

  // Arvind - TUE
  { name: 'KISHORE ELECTRICALS AND HOME APPLIANCES-HIMAYATH NG', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Kundan Stores-Himayath Ngr', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Lotus Steel Palace-Chikadpally', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Meera\'s Home Appliances-Himayath Nagar', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Sree Balaji Steel Palace-Ashok Nagar', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'TULSI HOME APPLIANCES-WEST MARREDPALLY', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Vardhaman Kitchen World-Amberpet', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'Vishal Shopping Centre-N.Nallakunta', salesTeam: 'Arvind', belt: 'TUE' },
  { name: 'SHRI SAI RAM ENTERPRISES', salesTeam: 'Arvind', belt: 'TUE' },

  // Arvind - WED
  { name: 'Eshwar Electrical & Electronics Homa Appliances-Alw', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'LITTLE FLOWER STEEL PALACE-ALWAL', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'NAINIKA STEEL PALACE-ALWAL', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'New Harshita Home Appliances-R.T.C Colony', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'PRIYANSHI STEEL PALACE-T ALWAL', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'Ramdev Home Appliances-Old Alwal', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'SRI MAHALAXMI STEEL PALACE-OLD ALWAL', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'SRI SAI LAXMI GANESH HOME APPLIANCES-T ALWAL', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'SRI VIJAY STEEL PALACE-LAL BAZAR', salesTeam: 'Arvind', belt: 'WED' },
  { name: 'Vijay Steel Palace-Lalbazar NO GST', salesTeam: 'Arvind', belt: 'WED' },

  // Praveen - FRI
  { name: 'Balaji Home Appliances-Alakapuri', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'Ever Green Plastic Bazar-Nacharam', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'Mahavir Emporium-Habsiguda', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'Metro Home Needs-Dilsukh Nagar', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'NEW DIVVELA ELECCALS-DILSUK NAGAR', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'S.S STEEL HOUSE-RK PURAM', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'SHREE MANGALDEEP STEEL PALACE-HABSIGUDA', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'SRI BALAJI STEEL PALACE SALES & SERVICE - V.S.N.P.', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'SRI HARI STEEL PALACE-TARNAKA', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'Sri Venkateshwara Steel Palace-Nacharam', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'SUN SOLUTION & SERVICES-PADMA RAO NAGAR', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'TRIVENI HOME APPLIANCES-Habsiguda', salesTeam: 'Praveen', belt: 'FRI' },
  { name: 'VENI HOME APPLIANCES-Habsiguda', salesTeam: 'Praveen', belt: 'FRI' },

  // Praveen - MON
  { name: 'Ashapura Steel & Home Appliances-Gachibowli', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'BHAWANI STEEL PALACE-NALLAGANDLA', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'Dhanalaxmi Steel & Plastics Center-Ameenpur', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'GAJANAND STEEL CENTER-MADHAPUR', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'GAJANAND STEEL PALACE-CHANDA NAGAR', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'LAXMI FANCY AND STEEL HOUSE-NIJAMPET', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'MAHADEV STEEL AND HOME APPLIANCES-GACHIBOWLI', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'Mahalakshmi Steel&Home Appliances-Madinaguda', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'MAHALAXMI STEEL CENTER-KONDAPUR', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'MARUDHAR SHOPPING MART-MADHAPUR', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'RAM STEEL & FANCY STORES-MIYAPUR', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'RAMA STEEL PALACE-NIJAMPET', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'Sri Dev Narayana-Kondapur', salesTeam: 'Praveen', belt: 'MON' },
  { name: 'The Chennai Silks', salesTeam: 'Praveen', belt: 'MON' },

  // Praveen - SAT
  { name: 'Bhavani Home Needs-Kapra', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'D R S Kitchen World-Neredmet', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Deepak Steel Palace-Neredmet', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Krishna Steel Home Appliances-As Rao Nagar', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Laxmi Priya Home Appliances-As Rao Nagar', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Maheshwari Home Appliances-Kapra', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Om Manikanta Home Ware-Ecil', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'PRAVEEN -GCK', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'RAMDEV FANCY & STEEL-ECIL', salesTeam: 'Praveen', belt: 'SAT' },
  { name: 'Swathi Steel Palace-As Rao Nagar', salesTeam: 'Praveen', belt: 'SAT' },

  // Praveen - THUR
  { name: 'Bharath Steel Corporation-Azamabad', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'BOMBAY STEEL PALACE-NALLAKUNTA', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'HINDUSTAN STEEL WORLD-AZAMABAD', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'POOJA STEEL HOUSE-Azamabad', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'Poonam Steel House-Ram Nagar', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'SHREE HIND METALS-AZAMABAD', salesTeam: 'Praveen', belt: 'THUR' },
  { name: 'Sri Divya Steel Palace-Nallakunta', salesTeam: 'Praveen', belt: 'THUR' },

  // Praveen - TUE
  { name: 'NEW NAKODA STEEL PALACE-Ameerpet', salesTeam: 'Praveen', belt: 'TUE' },
  { name: 'Parvathi Spares & Services Center-Ameerpet', salesTeam: 'Praveen', belt: 'TUE' },
  { name: 'Plastic World-Ameerpet', salesTeam: 'Praveen', belt: 'TUE' },
  { name: 'SRI VINAYAKA STEEL PALACE-AMEERPET', salesTeam: 'Praveen', belt: 'TUE' },
  { name: 'BAGGA\'S HOME GALLERY-AMEERPET', salesTeam: 'Praveen', belt: 'TUE' },
  { name: 'HYDERABAD HOTEL MART-SANATH NAGAR', salesTeam: 'Praveen', belt: 'TUE' },

  // Praveen - WED
  { name: 'Narasimha Swamy Home Needs-Suncity', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Sampathraj Manakchand Jain-General Bazar', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Sana Collections-R.P Rd', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'SARITHA PALACE-NALLAKUNTA', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Sri Anand Bhartan Bhandar-General Bazar', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Sri Annapurna Metals-General Bazar', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'SRI PRS METALS-GENERAL BAZAR', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'SRI RAKESH STEEL WORKS-GENERAL BAZAR', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'SRI SAIBABA STEEL PALACE-Hussaini Alam', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Sri Sakinala Steel Palace-R.P Rd', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'SRI TIRUPATI METAL MERCHANTS-SEC-BAD', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'V.Srinivas Rao Metal Merchant-General Bazar', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'A TO Z BAZAR-SUN-CITY', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'Ganesh Metal Merchants-General Bazar', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'INDIA NICE MART-ASIF NAGAR', salesTeam: 'Praveen', belt: 'WED' },
  { name: 'KEWAL STORES-GENERAL BAZAR', salesTeam: 'Praveen', belt: 'WED' }
];

// Helper to seed dealers if collection is empty
const seedDealers = async () => {
  try {
    const count = await Dealer.countDocuments();
    if (count === 0) {
      console.log('Seeding dealers database with hardcoded list...');
      await Dealer.insertMany(RAW_DEALERS);
      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error seeding dealers:', err.message);
  }
};

// Seed immediately on load
seedDealers();

// Get all dealers
router.get('/', async (req, res) => {
  try {
    // Seed on request if somehow empty
    const count = await Dealer.countDocuments();
    if (count === 0) {
      await Dealer.insertMany(RAW_DEALERS);
    }
    const dealers = await Dealer.find().sort({ name: 1 });
    res.json(dealers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new dealer
router.post('/', async (req, res) => {
  const { name, salesTeam, belt, contactNumber } = req.body;
  if (!name || !salesTeam || !belt) {
    return res.status(400).json({ message: 'All fields (name, salesTeam, belt) are required.' });
  }

  try {
    // Check if dealer already exists
    const existing = await Dealer.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'A dealer with this name already exists.' });
    }

    const newDealer = new Dealer({
      name: name.trim(),
      salesTeam: salesTeam.trim(),
      belt: belt.trim(),
      contactNumber: contactNumber ? contactNumber.trim() : ''
    });

    const saved = await newDealer.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a dealer
router.put('/:id', async (req, res) => {
  try {
    const updated = await Dealer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a dealer
router.delete('/:id', async (req, res) => {
  try {
    await Dealer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Dealer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
