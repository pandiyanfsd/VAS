import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Receipt, Plus, Search, Filter, Edit, Trash2, CheckCircle, AlertCircle, Clock, X, DollarSign, Tag, Calendar, User, Download, Printer, Camera, Eye, RefreshCw, Upload, FileText } from 'lucide-react';
import Tesseract from 'tesseract.js';

const ManageExpenses = ({ isCashier = false, currentCashier = null }) => {
  const [expenses, setExpenses] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Create & Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Scanning & Preview states
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewImageSrc, setPreviewImageSrc] = useState('');

  // Camera refs and active state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Infrastructure & Roads',
    subDetails: '',
    cashierId: '',
    status: isCashier ? 'pending' : 'approved',
    billImage: ''
  });

  // Delete Modal state
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const categories = [
    'Infrastructure & Roads',
    'Water Supply & Sanitation',
    'Electricity & Utilities',
    'Festivals & Community Events',
    'Administrative & Legal',
    'Emergency & Medical Relief',
    'Miscellaneous / Other'
  ];

  const fetchExpensesAndCashiers = async () => {
    setLoading(true);
    try {
      const expensesUrl = isCashier
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses?cashierId=${currentCashier?._id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`;
      
      const promises = [axios.get(expensesUrl)];
      if (!isCashier) {
        promises.push(axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cashiers`));
      }
      
      const results = await Promise.all(promises);
      setExpenses(results[0].data);
      
      if (!isCashier) {
        setCashiers(results[1].data);
        if (results[1].data.length > 0) {
          setFormData(prev => ({ ...prev, cashierId: results[1].data[0]._id }));
        }
      } else {
        setFormData(prev => ({ 
          ...prev, 
          cashierId: currentCashier?._id || '',
          status: 'pending'
        }));
      }
    } catch (error) {
      console.error('Error fetching expenses/cashiers:', error);
      setErrorMsg('Failed to load expenses data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCashier && !currentCashier) return;
    fetchExpensesAndCashiers();
  }, [isCashier, currentCashier]);

  useEffect(() => {
    // Load PDF.js dynamically from CDN to parse PDFs in the browser
    if (!window.pdfjsLib && !window['pdfjs-dist/build/pdf']) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (pdfjsLib) {
          // Bypassing Worker CORS restriction via Blob URL wrapper
          const workerCode = "importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js');";
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedExpense(null);
    setFormData({
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Infrastructure & Roads',
      subDetails: '',
      cashierId: isCashier ? currentCashier?._id : (cashiers.length > 0 ? cashiers[0]._id : ''),
      status: isCashier ? 'pending' : 'approved',
      billImage: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    setModalMode('edit');
    setSelectedExpense(expense);
    setFormData({
      title: expense.title || '',
      amount: expense.amount || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: expense.category || 'Infrastructure & Roads',
      subDetails: expense.subDetails || '',
      cashierId: expense.cashierId?._id || expense.cashierId || (isCashier ? currentCashier?._id : (cashiers.length > 0 ? cashiers[0]._id : '')),
      status: expense.status || (isCashier ? 'pending' : 'approved'),
      billImage: expense.billImage || ''
    });
    setIsModalOpen(true);
  };

  // OCR and File Scanning Handlers
  const handleCloseModal = () => {
    stopCamera();
    setIsModalOpen(false);
  };

  const startCamera = async () => {
    setErrorMsg('');
    setCameraActive(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraActive(false);
        setErrorMsg("Failed to access camera. Please check permissions or upload an image instead.");
      }
    }, 100);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      
      // Update form
      setFormData(prev => ({ ...prev, billImage: base64 }));
      
      // Stop stream
      stopCamera();
      
      // Run OCR using base64 image data
      runOCR(base64);
    } catch (err) {
      console.error("Failed to capture image:", err);
      setErrorMsg("Failed to capture snapshot from webcam feed.");
    }
  };

  const parsePdfFile = async (file) => {
    setScanning(true);
    setScanProgress(0.1);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) {
        throw new Error("PDF parser library (PDF.js) is not loaded yet. Please wait a second and try again.");
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      // Try to extract digital text first
      const textContent = await page.getTextContent();
      
      // Reconstruct lines preserving newlines by sorting and grouping text items by vertical y coordinates
      const items = [...textContent.items];
      items.sort((a, b) => {
        // y decreases down the page in PDF space, so group top-to-bottom
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) {
          return yDiff;
        }
        return a.transform[4] - b.transform[4]; // left-to-right
      });

      let reconstructedLines = [];
      let currentLine = [];
      let lastY = null;

      for (const item of items) {
        if (lastY === null) {
          currentLine.push(item.str);
          lastY = item.transform[5];
        } else {
          const yDiff = Math.abs(lastY - item.transform[5]);
          if (yDiff > 5) {
            reconstructedLines.push(currentLine.join(' '));
            currentLine = [item.str];
            lastY = item.transform[5];
          } else {
            currentLine.push(item.str);
          }
        }
      }
      if (currentLine.length > 0) {
        reconstructedLines.push(currentLine.join(' '));
      }

      let extractedText = reconstructedLines.join('\n');
      
      // If the extracted text is very short/empty, render it onto a canvas and perform OCR
      if (extractedText.trim().length < 10) {
        console.log("PDF digital text is empty or too short. Rendering page to canvas for OCR...");
        
        const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for higher OCR accuracy
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        setScanProgress(0.3);
        
        Tesseract.recognize(
          canvas,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setScanProgress(0.3 + m.progress * 0.7);
              }
            }
          }
        ).then(({ data: { text } }) => {
          setScanning(false);
          parseReceiptText(text);
        }).catch(err => {
          console.error("Tesseract PDF Canvas OCR Error:", err);
          setScanning(false);
          setErrorMsg("Failed to run OCR on PDF page canvas.");
        });
      } else {
        // Direct digital text extraction
        setScanProgress(1.0);
        setTimeout(() => {
          setScanning(false);
          parseReceiptText(extractedText);
        }, 300);
      }
    } catch (error) {
      console.error("PDF Parsing Error:", error);
      setScanning(false);
      setErrorMsg("Failed to parse PDF document: " + error.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';

    // Convert file to Base64 to store in DB
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setFormData(prev => ({ ...prev, billImage: base64 }));
      
      if (isPdf) {
        // Parse PDF file (direct text extraction or Canvas OCR)
        parsePdfFile(file);
      } else {
        // Run local OCR
        runOCR(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const runOCR = (file) => {
    setScanning(true);
    setScanProgress(0);
    
    Tesseract.recognize(
      file,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanProgress(m.progress);
          }
        }
      }
    ).then(({ data: { text } }) => {
      setScanning(false);
      parseReceiptText(text);
    }).catch(err => {
      console.error("OCR Error:", err);
      setScanning(false);
      setErrorMsg("Failed to extract text from image. You can still input details manually.");
    });
  };

  const parseReceiptText = (text) => {
    if (!text) return;
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Helper to extract vendor name cleanly (ignore address segments after commas, or extract from quotes)
    const extractVendorName = (line) => {
      let vendor = line.trim();
      
      // If there are quotes, try to extract the quoted text
      const quoteMatch = vendor.match(/["']([^"']+)["']/);
      if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length > 2) {
        return quoteMatch[1].trim();
      }
      
      // If there is a comma, take the part before the first comma
      if (vendor.includes(',')) {
        const parts = vendor.split(',');
        if (parts[0].trim().length > 2) {
          return parts[0].trim().replace(/["']/g, '').trim(); // strip quotes
        }
      }
      
      return vendor.replace(/["']/g, '').trim();
    };

    // 1. Payee / "To Whom" Parsing
    let vendorName = '';
    // Look for customer/payee/billed to patterns first (specific "to whom")
    for (const line of lines) {
      const matchTo = line.match(/(?:billed\s*to|sold\s*to|to|m\/s\.?|payee|customer|client)\s*[:\-=\s]\s*([a-z0-9\s&.',\-\/]+)/i);
      if (matchTo && matchTo[1] && matchTo[1].trim().length > 2) {
        vendorName = matchTo[1].trim();
        break;
      }
    }
    
    if (!vendorName) {
      for (const line of lines) {
        const cleanLine = line.replace(/[^\w\s&'-]/g, '').trim();
        if (
          cleanLine &&
          cleanLine.length > 3 &&
          !/^\d+$/.test(cleanLine) && 
          !/date/i.test(cleanLine) && 
          !/time/i.test(cleanLine) &&
          !/total|amount|rs|₹|net|tax/i.test(cleanLine) &&
          !/invoice|bill\s*no|receipt|voucher/i.test(cleanLine) &&
          !/cashier/i.test(cleanLine)
        ) {
          vendorName = extractVendorName(line);
          break;
        }
      }
    }

    if (!vendorName && lines.length > 0) {
      vendorName = extractVendorName(lines[0]);
    }

    // Prioritize "St. Jude's Public School" or "St Jude's" if present in the text
    let institutionName = '';
    for (const line of lines) {
      if (/st\.?\s*jude/i.test(line)) {
        const matchSchool = line.match(/(st\.?\s*jude'?s?\s*(?:public\s*)?school)/i);
        if (matchSchool && matchSchool[1]) {
          institutionName = matchSchool[1].trim();
          break;
        }
        const matchJude = line.match(/(st\.?\s*jude'?s?)/i);
        if (matchJude && matchJude[1]) {
          institutionName = matchJude[1].trim();
        }
      }
    }
    if (institutionName) {
      vendorName = institutionName;
    }

    // 2. Recipient Name / Student / Member Name
    let recipientName = '';
    for (const line of lines) {
      const matchName = line.match(/(?:student\s*name|member\s*name|name|recipient)\s*[:\-=\s]\s*([a-z0-9\s&.',\-]+)/i);
      if (matchName && matchName[1]) {
        const cleanName = matchName[1].trim();
        if (cleanName && cleanName.length > 2 && !/^(?:no|num|class|roll|date|amt|amount|total|rs|inr|cashier|principal|prepared)$/i.test(cleanName)) {
          recipientName = cleanName;
          break;
        }
      }
    }

    // 2a. Class / Standard Parsing
    let className = '';
    for (const line of lines) {
      const matchClass = line.match(/class\s*[:\-=\s]\s*([a-z0-9\-\/]+)/i);
      if (matchClass && matchClass[1]) {
        className = matchClass[1].trim();
        break;
      }
    }

    // 2b. Roll Number Parsing
    let rollNo = '';
    for (const line of lines) {
      const matchRoll = line.match(/roll\s*(?:no\.?|#|number|num)?\s*[:\-=\s]\s*([a-z0-9]+)/i);
      if (matchRoll && matchRoll[1]) {
        rollNo = matchRoll[1].trim();
        break;
      }
    }

    // 2c. Payment Method Parsing
    let paymentMethod = '';
    for (const line of lines) {
      if (/transfer|cheque|cash|card|upi|neft|rtgs|mode/i.test(line) && !/total|amount/i.test(line)) {
        const matchMode = line.match(/(?:transfer\s*on|mode|via|by)\s*[\d\-\/]*\s*\/?\s*([a-z0-9\s]+(?:mode|cheque|cash|card|upi|transfer)?)/i);
        if (matchMode && matchMode[1]) {
          paymentMethod = matchMode[1].trim();
          break;
        } else if (/cheque\s*mode/i.test(line)) {
          paymentMethod = 'Cheque Mode';
          break;
        } else if (/cheque/i.test(line)) {
          paymentMethod = 'Cheque';
          break;
        }
      }
    }

    // 3. Amount Parsing (Find decimals or numbers near TOTAL/NET/AMOUNT keywords)
    let amountVal = '';
    const normalizedText = text.replace(/(rs\.?|₹|inr)\s*/ig, '$1');
    const amountRegexes = [
      /(?:total|net|amount|due|payable|cash|grand\s*total)\s*(?:amount|due|payable)?\s*(?::|=|\s)?\s*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i,
      /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d{2})?)/i,
      /([\d,]+\.\d{2})/
    ];

    let candidateAmounts = [];
    for (const regex of amountRegexes) {
      const matches = normalizedText.match(new RegExp(regex.source, 'gi'));
      if (matches) {
        for (const matchStr of matches) {
          const execMatch = regex.exec(matchStr);
          if (execMatch && execMatch[1]) {
            const cleanNum = parseFloat(execMatch[1].replace(/,/g, ''));
            if (!isNaN(cleanNum) && cleanNum > 0) {
              candidateAmounts.push(cleanNum);
            }
          }
        }
      }
    }

    lines.forEach(line => {
      if (/total|net|payable|amount/i.test(line)) {
        const numMatch = line.match(/([\d,]+(?:\.\d{2})?)/);
        if (numMatch) {
          const cleanNum = parseFloat(numMatch[1].replace(/,/g, ''));
          if (!isNaN(cleanNum) && cleanNum > 0) {
            candidateAmounts.push(cleanNum);
          }
        }
      }
    });

    if (candidateAmounts.length > 0) {
      const maxAmount = Math.max(...candidateAmounts);
      amountVal = maxAmount.toString();
    }

    // 4. Date Parsing
    const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b|\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/;
    const dateMatch = text.match(dateRegex);
    let parsedDate = '';
    
    if (dateMatch) {
      if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
        let day = parseInt(dateMatch[1]);
        let month = parseInt(dateMatch[2]);
        let year = parseInt(dateMatch[3]);
        if (year < 100) year += 2000;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          parsedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
        let year = parseInt(dateMatch[4]);
        let month = parseInt(dateMatch[5]);
        let day = parseInt(dateMatch[6]);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          parsedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // 5. Voucher Ref No Parsing
    let voucherRef = '';
    for (const line of lines) {
      const matchRef = line.match(/(?:voucher|inv(?:oice)?|bill|receipt|ref|vchr|vno|s\.?\s*no|sl\.?\s*no|serial)\s*(?:no\.?|#|number|num)?\s*[:\-=\s]?\s*([a-z0-9\-\/\.\#]+)/i);
      if (matchRef && matchRef[1] && matchRef[1].trim().length > 0) {
        const refVal = matchRef[1].trim();
        if (refVal && !/^(?:no|num|date|amt|amount|total|rs|inr|serial)$/i.test(refVal)) {
          voucherRef = refVal;
          break;
        }
      }
    }

    // 6. Particulars (Detailed Explanation) Parsing
    let particularsLines = [];
    let particularsHeaderIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (/particulars|description|details|items/i.test(lines[i])) {
        particularsHeaderIndex = i;
        break;
      }
    }

    if (particularsHeaderIndex !== -1) {
      for (let i = particularsHeaderIndex + 1; i < Math.min(lines.length, particularsHeaderIndex + 7); i++) {
        const line = lines[i];
        if (
          line && 
          !/total|tax|subtotal|gst|vat|rupees|amount|net|payable|prepared|printed|email|web/i.test(line) &&
          !/^\d+$/.test(line)
        ) {
          particularsLines.push(line);
        }
        if (particularsLines.length >= 5) break;
      }
    } else {
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine === vendorName || cleanLine.toLowerCase().includes(vendorName.toLowerCase())) continue;
        if (/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(cleanLine)) continue;
        if (/\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/.test(cleanLine)) continue;
        if (/date|time/i.test(cleanLine)) continue;
        if (/total|tax|subtotal|gst|vat|rupees|amount|net|payable|round|bal|balance|due|cash|card|upi|discount|disc/i.test(cleanLine)) continue;
        if (/tel|phone|mobile|cell|email|www|website|address|street|road|near|opposite/i.test(cleanLine)) continue;
        if (/thank|visit|terms|condition|welcome|duplicate|original|customer|client|cashier|operator|printed/i.test(cleanLine)) continue;
        if (/^[^\w]+$/.test(cleanLine) || cleanLine.length < 3) continue;

        particularsLines.push(cleanLine);
        if (particularsLines.length >= 5) break;
      }
    }

    // Helper to clean quantities and prices from item descriptions
    const cleanItemName = (line) => {
      // Remove leading index numbers (e.g. "1.", "01.", "1)")
      let cleaned = line.replace(/^\s*[\d\.\-\)\*]+\s*/g, '');
      // Remove trailing prices (e.g. "200.00", "₹1500", "Rs.500", "500")
      cleaned = cleaned.replace(/\s*(?:rs\.?|₹|inr)?\s*[\d,]+(?:\.\d{2})?\s*$/i, '');
      // Remove quantity formats like "10x", "x10", "10 nos", "qty 2", "5 pcs"
      cleaned = cleaned.replace(/\s*\d+\s*(?:nos|pcs|qty|x|\*)\s*/gi, ' ');
      cleaned = cleaned.replace(/\s*(?:nos|pcs|qty|x|\*)\s*\d+\s*/gi, ' ');
      // Clean duplicate spaces and trim
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    };

    const cleanedItems = particularsLines.map(cleanItemName).filter(Boolean);
    
    // Analyze particulars items to categorize them semantically
    let hasHostel = false;
    let hasSchool = false;
    let hasStore = false;
    let hasAcademy = false;
    let hasMess = false;
    let hasTransport = false;

    for (const item of cleanedItems) {
      if (/hostel|dorm/i.test(item)) hasHostel = true;
      if (/school|tuition|class|admission|education/i.test(item)) hasSchool = true;
      if (/store|uniform|book|stationery/i.test(item)) hasStore = true;
      if (/academy|computer|course|training/i.test(item)) hasAcademy = true;
      if (/mess|food|canteen|dining/i.test(item)) hasMess = true;
      if (/transport|bus|van|travel/i.test(item)) hasTransport = true;
    }

    let particularsSummary = '';
    let categoryDetails = [];
    
    if (hasSchool) categoryDetails.push('School Tuition');
    if (hasHostel) categoryDetails.push('Hostel');
    if (hasStore) categoryDetails.push('Stores');
    if (hasAcademy) categoryDetails.push('Academy');
    if (hasMess) categoryDetails.push('Mess');
    if (hasTransport) categoryDetails.push('Transport');

    if (hasSchool && hasHostel) {
      particularsSummary = 'School & Hostel Fees';
    } else if (hasSchool) {
      particularsSummary = 'School Fees';
    } else if (hasHostel) {
      particularsSummary = 'Hostel Fees';
    } else if (hasStore) {
      particularsSummary = 'School Stores Expense';
    } else if (hasAcademy) {
      particularsSummary = 'Academy Course Fees';
    } else if (cleanedItems.length > 0) {
      particularsSummary = cleanedItems.slice(0, 2).join(' & ');
    } else {
      particularsSummary = 'School Expense';
    }

    // Construct descriptive Title: [Merchant Name] - [Particulars Summary] (Student Name if present)
    let generatedTitle = vendorName;
    if (recipientName) {
      generatedTitle = `${vendorName} - ${particularsSummary} (${recipientName})`;
    } else {
      generatedTitle = `${vendorName} - ${particularsSummary}`;
    }

    // Construct descriptive Explanation (Description)
    let explanationVal = '';
    const amountStr = amountVal ? `₹${parseFloat(amountVal).toLocaleString('en-IN')}` : '';
    const dateStr = parsedDate ? ` on ${new Date(parsedDate).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: 'numeric'})}` : '';
    
    explanationVal = `Fees payment of ${amountStr ? amountStr : 'specified amount'} made to ${vendorName}${dateStr}`;

    if (recipientName) {
      explanationVal += ` on behalf of student ${recipientName}`;
      let studentDetails = [];
      if (className) studentDetails.push(`Class: ${className}`);
      if (rollNo) studentDetails.push(`Roll No: ${rollNo}`);
      if (studentDetails.length > 0) {
        explanationVal += ` (${studentDetails.join(', ')})`;
      }
    }

    if (categoryDetails.length > 0) {
      explanationVal += ` covering ${categoryDetails.join(', ')} fees`;
    }

    if (paymentMethod) {
      explanationVal += ` paid via ${paymentMethod}`;
    }

    if (voucherRef) {
      explanationVal += `. (Voucher Ref: ${voucherRef})`;
    } else {
      explanationVal += `.`;
    }

    // Autofill form
    setFormData(prev => ({
      ...prev,
      title: generatedTitle,
      amount: amountVal || prev.amount,
      date: parsedDate || prev.date,
      subDetails: explanationVal
    }));

    // Show nice status toast
    let scanMsg = "Bill scanned successfully! ";
    let parsedFields = [];
    parsedFields.push(`Title: "${generatedTitle}"`);
    if (amountVal) parsedFields.push(`Amount: ₹${parseFloat(amountVal).toLocaleString()}`);
    if (parsedDate) parsedFields.push(`Date: ${parsedDate}`);
    if (recipientName) parsedFields.push(`Name: "${recipientName}"`);
    if (cleanedItems.length > 0) parsedFields.push(`Items: "${cleanedItems.join(', ')}"`);
    if (voucherRef) parsedFields.push(`Voucher Ref: "${voucherRef}"`);
    
    if (parsedFields.length > 0) {
      setSuccessMsg(scanMsg + "Extracted:\n" + parsedFields.join("\n"));
    } else {
      setSuccessMsg(scanMsg + "Please check or edit the form fields manually.");
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      setErrorMsg('Please provide a valid title and positive amount.');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        amount: Number(formData.amount),
        date: formData.date,
        category: formData.category,
        subDetails: formData.subDetails,
        cashierId: formData.cashierId || undefined,
        status: formData.status,
        billImage: formData.billImage || undefined
      };

      if (modalMode === 'create') {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`, payload);
        setSuccessMsg(`Successfully logged expense: "${formData.title}" (₹${Number(formData.amount).toLocaleString()})`);
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/${selectedExpense._id}`, payload);
        setSuccessMsg(`Successfully updated expense: "${formData.title}"`);
      }

      handleCloseModal();
      fetchExpensesAndCashiers();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to save expense record.');
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/${expenseToDelete._id}`);
      setSuccessMsg(`Successfully deleted expense: "${expenseToDelete.title}"`);
      setExpenseToDelete(null);
      fetchExpensesAndCashiers();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to delete expense.');
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchTerm || (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.subDetails && exp.subDetails.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (exp.status || 'approved') === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalApprovedAmount = filteredExpenses.filter(e => (e.status || 'approved') === 'approved').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalPendingAmount = filteredExpenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      setErrorMsg('No expenses available to export based on current filters.');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Logged By', 'Amount (INR)', 'Status', 'Details & Voucher Ref'];
    const rows = filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString('en-IN'),
      `"${(exp.title || '').replace(/"/g, '""')}"`,
      `"${exp.category || 'General'}"`,
      `"${exp.cashierId?.name || 'Admin Treasury'}"`,
      exp.amount || 0,
      (exp.status || 'approved').toUpperCase(),
      `"${(exp.subDetails || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `village_expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredExpenses.length === 0) {
      setErrorMsg('No expenses available to print based on current filters.');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Village Expenses Audit Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #ffffff; }
            .header { text-align: center; border-bottom: 3px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
            h1 { font-size: 2.2rem; color: #1e293b; margin: 0 0 8px 0; }
            .meta { font-size: 0.95rem; color: #64748b; margin-bottom: 16px; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; margin-bottom: 32px; display: flex; justify-content: space-around; font-size: 1.1rem; }
            .summary-box strong { color: #e11d48; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 0.95rem; }
            th { background: #f1f5f9; color: #334155; padding: 16px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
            td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
            .footer { text-align: center; font-size: 0.85rem; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div className="header">
            <h1>Denalai Village Administration</h1>
            <div className="meta">Official Expenditure & Disbursement Audit Report • Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
            <div style="font-size: 0.9rem; color: #475569;">
              Active Filters: Category [${categoryFilter}] | Status [${statusFilter}]
            </div>
          </div>
          <div className="summary-box">
            <div>Total Records: <strong>${filteredExpenses.length}</strong></div>
            <div>Total Expenditures: <strong style="color: #9f1239;">₹${totalExpenseAmount.toLocaleString()}</strong></div>
            <div>Approved & Disbursed: <strong style="color: #10b981;">₹${totalApprovedAmount.toLocaleString()}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Title / Payee</th>
                <th>Category</th>
                <th>Logged By</th>
                <th style="text-align: right;">Amount (₹)</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(exp => `
                <tr>
                  <td style="white-space: nowrap;">${new Date(exp.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    <strong>${exp.title}</strong>
                    ${exp.subDetails ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${exp.subDetails}</div>` : ''}
                  </td>
                  <td>${exp.category || 'General'}</td>
                  <td>${exp.cashierId?.name || 'Admin Treasury'}</td>
                  <td style="text-align: right; font-weight: 700; color: #e11d48;">₹${(exp.amount || 0).toLocaleString()}</td>
                  <td style="text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; background: ${(exp.status || 'approved') === 'approved' ? '#d1fae5' : '#fef3c7'}; color: ${(exp.status || 'approved') === 'approved' ? '#065f46' : '#92400e'};">
                      ${(exp.status || 'approved').toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div className="footer">
            Denalai Village Financial Transparency Committee • System Generated Audit Trail
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="manage-expenses-container animate-fade-in" style={{ padding: '20px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Overview Banner */}
      <div className="expenses-overview glass-panel mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', color: '#0f172a', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(203, 213, 225, 0.8)' }}>
        <div style={{ padding: '24px', background: 'rgba(225, 29, 72, 0.08)', borderRadius: '20px', border: '1px solid rgba(225, 29, 72, 0.25)', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#e11d48', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(225,29,72,0.4)' }}>
              <Receipt size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#be123c', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Filtered Expenses Total</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#9f1239', fontWeight: '900' }}>₹{totalExpenseAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#881337', display: 'block', marginTop: '6px', fontWeight: '600' }}>Across {filteredExpenses.length} transaction records</span>
        </div>

        <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#10b981', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(16,185,129,0.4)' }}>
              <CheckCircle size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Approved & Disbursed</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: '900' }}>₹{totalApprovedAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#065f46', display: 'block', marginTop: '6px', fontWeight: '600' }}>Official village budget allocations</span>
        </div>

        <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#f59e0b', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(245,158,11,0.4)' }}>
              <Clock size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#b45309', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Pending Verification</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#d97706', fontWeight: '900' }}>₹{totalPendingAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#92400e', display: 'block', marginTop: '6px', fontWeight: '600' }}>Awaiting treasury committee approval</span>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="toolbar glass-panel mb-8" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleOpenCreateModal} className="btn-primary" style={{ height: '52px', padding: '0 28px', borderRadius: '16px', background: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Plus size={22} /> Log New Expense
          </button>
          <button onClick={exportToCSV} style={{ height: '52px', padding: '0 24px', borderRadius: '16px', background: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Download size={20} /> Export CSV
          </button>
          <button onClick={exportToPDF} style={{ height: '52px', padding: '0 24px', borderRadius: '16px', background: '#0f172a', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(15,23,42,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Printer size={20} /> Export / Print PDF
          </button>
        </div>

        <div className="filter-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flex: '1', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Search Bar */}
          <div className="search-box" style={{ position: 'relative', minWidth: '300px', flex: '1', maxWidth: '420px', height: '52px' }}>
            <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: searchTerm ? '#6366f1' : '#94a3b8', transition: 'color 0.2s' }} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search vouchers, titles or categories..." 
              style={{ 
                width: '100%', 
                height: '52px', 
                padding: '0 48px', 
                borderRadius: '16px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.95rem', 
                fontWeight: '600', 
                color: '#0f172a', 
                outline: 'none', 
                background: '#ffffff', 
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxSizing: 'border-box' 
              }}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ 
                  position: 'absolute', 
                  right: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#64748b', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '52px' }}>
            <Filter size={18} color="#64748b" />
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ height: '52px', padding: '0 20px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', color: '#334155', background: '#f8fafc', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="all">📁 All Categories ({expenses.length})</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: '52px', padding: '0 20px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', color: '#334155', background: '#f8fafc', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          >
            <option value="all">⚡ All Statuses</option>
            <option value="approved">🟢 Approved Only</option>
            <option value="pending">🟡 Pending Only</option>
            <option value="rejected">🔴 Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="section-title mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>Village Expenditure Records</h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>Showing {filteredExpenses.length} transactions</span>
      </div>

      {loading ? (
        <div className="text-center py-12 glass-panel" style={{ padding: '40px 0', color: '#64748b' }}>Loading expense transactions...</div>
      ) : (
        <div className="ledger-card glass-panel mb-12" style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Date</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title & Description</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged By</th>
                <th style={{ padding: '18px 16px', textAlign: 'right', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                <th style={{ padding: '18px 16px', textAlign: 'center', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '18px 16px', textAlign: 'center', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp, idx) => (
                <tr key={exp._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '16px 12px', color: '#1e293b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '1.05rem', fontWeight: '800' }}>{exp.title}</strong>
                    {exp.subDetails && <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '4px', fontStyle: 'italic', maxWidth: '360px' }}>{exp.subDetails}</span>}
                    {exp.billImage && (
                      <button 
                        onClick={() => setPreviewImageSrc(exp.billImage)}
                        style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', 
                          padding: '4px 10px', background: exp.billImage.startsWith('data:application/pdf') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(79, 70, 229, 0.12)', 
                          color: exp.billImage.startsWith('data:application/pdf') ? '#ef4444' : '#4f46e5', 
                          border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' 
                        }}
                        onMouseOver={e => e.currentTarget.style.background = exp.billImage.startsWith('data:application/pdf') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(79, 70, 229, 0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = exp.billImage.startsWith('data:application/pdf') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(79, 70, 229, 0.12)'}
                      >
                        {exp.billImage.startsWith('data:application/pdf') ? (
                          <>
                            <FileText size={12} /> View PDF Bill
                          </>
                        ) : (
                          <>
                            <Receipt size={12} /> View Bill Image
                          </>
                        )}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', fontWeight: '700', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {exp.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569', fontWeight: '600' }}>
                    {exp.cashierId?.name || 'Admin Treasury'}
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                    <strong style={{ color: '#e11d48', fontSize: '1.2rem', fontWeight: '900' }}>₹{(exp.amount || 0).toLocaleString()}</strong>
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      background: (exp.status || 'approved') === 'approved' ? 'rgba(16, 185, 129, 0.15)' : (exp.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'), 
                      color: (exp.status || 'approved') === 'approved' ? '#10b981' : (exp.status === 'pending' ? '#d97706' : '#ef4444'), 
                      fontWeight: '800', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px' 
                    }}>
                      {(exp.status || 'approved').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(exp)}
                        disabled={isCashier && exp.status !== 'pending'}
                        style={{ 
                          background: isCashier && exp.status !== 'pending' ? '#f1f5f9' : '#eff6ff', 
                          color: isCashier && exp.status !== 'pending' ? '#94a3b8' : '#2563eb', 
                          border: isCashier && exp.status !== 'pending' ? '1px solid #cbd5e1' : '1px solid #bfdbfe', 
                          borderRadius: '12px', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', 
                          cursor: isCashier && exp.status !== 'pending' ? 'not-allowed' : 'pointer', 
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
                        }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => setExpenseToDelete(exp)}
                        disabled={isCashier && exp.status !== 'pending'}
                        style={{ 
                          background: isCashier && exp.status !== 'pending' ? '#f1f5f9' : '#fef2f2', 
                          color: isCashier && exp.status !== 'pending' ? '#94a3b8' : '#ef4444', 
                          border: isCashier && exp.status !== 'pending' ? '1px solid #cbd5e1' : '1px solid #fecaca', 
                          borderRadius: '12px', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', 
                          cursor: isCashier && exp.status !== 'pending' ? 'not-allowed' : 'pointer', 
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>No matching expense records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={handleCloseModal} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '100%', borderRadius: '28px', padding: '36px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '900', margin: 0 }}>
                  {modalMode === 'create' ? 'Log New Village Expenditure' : 'Edit Expenditure Record'}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Treasury Audit & Payment Voucher Form</span>
              </div>
              <button onClick={handleCloseModal} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
              {/* Scan Bill Section */}
              <div style={{ marginBottom: '24px', padding: '18px', background: 'rgba(99, 102, 241, 0.05)', border: '2px dashed rgba(99, 102, 241, 0.25)', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#312e81', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Receipt size={18} /> Upload or Scan Receipt/Bill
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#4f46e5', fontWeight: '600' }}>
                      Supports images of printed or handwritten bills. OCR parses text.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={cameraActive}
                      style={{ 
                        padding: '8px 16px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', 
                        fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                        gap: '6px', boxShadow: '0 4px 10px rgba(15,23,42,0.3)', transition: 'all 0.2s', opacity: cameraActive ? 0.5 : 1
                      }}
                    >
                      <Camera size={14} /> Open Camera
                    </button>

                    <input 
                      type="file" 
                      id="bill-scanner-file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <label 
                      htmlFor="bill-scanner-file"
                      style={{ 
                        padding: '8px 16px', background: '#4f46e5', color: '#ffffff', borderRadius: '12px', 
                        fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                        gap: '6px', boxShadow: '0 4px 10px rgba(79,70,229,0.3)', transition: 'all 0.2s', margin: 0
                      }}
                    >
                      <Upload size={14} /> Upload File
                    </label>
                    
                    {formData.billImage && !cameraActive && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, billImage: '' }))}
                        style={{ 
                          padding: '8px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', 
                          borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Webcam Live Capture Viewfinder */}
                {cameraActive && (
                  <div style={{ background: '#000000', borderRadius: '16px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px' }}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={{ width: '100%', maxHeight: '320px', borderRadius: '12px', background: '#1e293b', objectFit: 'contain' }}
                    />
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        style={{ 
                          padding: '10px 20px', background: '#10b981', color: '#ffffff', border: 'none', 
                          borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
                        }}
                      >
                        <Camera size={14} /> Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{ 
                          padding: '10px 20px', background: '#ef4444', color: '#ffffff', border: 'none', 
                          borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(239,68,68,0.3)'
                        }}
                      >
                        <X size={14} /> Close Camera
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress bar / Scanning status */}
                {scanning && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Performing OCR Scan...
                      </span>
                      <span>{(scanProgress * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanProgress * 100}%`, height: '100%', background: '#4f46e5', borderRadius: '3px', transition: 'width 0.2s ease-out' }}></div>
                    </div>
                  </div>
                )}

                {/* Uploaded Thumbnail Preview */}
                {formData.billImage && !scanning && !cameraActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#ffffff', borderRadius: '14px', padding: '10px', border: '1px solid #cbd5e1', flexWrap: 'wrap' }}>
                    {formData.billImage.startsWith('data:application/pdf') ? (
                      <div style={{ width: '56px', height: '56px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <FileText size={24} />
                      </div>
                    ) : (
                      <img 
                        src={formData.billImage} 
                        alt="Bill Preview" 
                        style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    )}
                    <div style={{ flex: '1', minWidth: '150px' }}>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>Bill attached successfully</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                        {formData.billImage.startsWith('data:application/pdf') ? 'PDF Bill Document saved in DB' : 'Handwritten or printed photo saved in DB'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewImageSrc(formData.billImage)}
                      style={{ 
                        padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', 
                        borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Eye size={12} /> View Full
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expense Title / Payee</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="e.g. Borewell Pump Motor Repair" 
                    required 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (₹)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '16px', fontSize: '1.3rem', color: '#e11d48', fontWeight: '800' }}>₹</span>
                    <input 
                      type="number" 
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: e.target.value})} 
                      placeholder="5000" 
                      required 
                      min="1"
                      style={{ width: '100%', padding: '16px 16px 16px 40px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.15rem', fontWeight: '800', color: '#e11d48', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Date Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenditure Date</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#334155', background: '#ffffff', outline: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Logged By Cashier Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged By / Disbursed Via</label>
                  <select 
                    value={formData.cashierId} 
                    onChange={e => setFormData({...formData, cashierId: e.target.value})} 
                    disabled={isCashier}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#334155', background: isCashier ? '#f1f5f9' : '#ffffff', outline: 'none', cursor: isCashier ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {isCashier ? (
                      <option value={currentCashier?._id || ''}>👤 {currentCashier?.name || 'You'} (You)</option>
                    ) : (
                      <>
                        <option value="">🏛️ Admin Treasury (Direct)</option>
                        {cashiers.map(cashier => <option key={cashier._id} value={cashier._id}>👤 {cashier.name} (ID: #{cashier.cashierId})</option>)}
                      </>
                    )}
                  </select>
                </div>

                {/* Voucher Approval Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approval Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    disabled={isCashier}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '800', color: formData.status === 'approved' ? '#10b981' : (formData.status === 'pending' ? '#d97706' : '#ef4444'), background: isCashier ? '#f1f5f9' : '#ffffff', outline: 'none', cursor: isCashier ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {isCashier ? (
                      <option value={formData.status}>
                        {formData.status === 'approved' && '🟢 APPROVED'}
                        {formData.status === 'pending' && '🟡 PENDING COMMITTEE REVIEW'}
                        {formData.status === 'rejected' && '🔴 REJECTED CLAIM'}
                      </option>
                    ) : (
                      <>
                        <option value="approved">🟢 APPROVED & DISBURSED</option>
                        <option value="pending">🟡 PENDING COMMITTEE REVIEW</option>
                        <option value="rejected">🔴 REJECTED CLAIM</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Sub Details / Description */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detailed Explanation & Voucher Ref #</label>
                <textarea 
                  value={formData.subDetails} 
                  onChange={e => setFormData({...formData, subDetails: e.target.value})} 
                  placeholder="Include vendor details, bill reference numbers, or purpose explanation..." 
                  rows="3"
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '600', color: '#334155', outline: 'none', background: '#ffffff', transition: 'all 0.2s', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  style={{ padding: '14px 24px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '14px 32px', borderRadius: '16px', background: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
                >
                  {modalMode === 'create' ? 'Save & Record Voucher' : 'Update Expenditure Record'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setExpenseToDelete(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <AlertCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Confirm Deletion</h2>
            <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>
              Are you sure you want to permanently delete the expenditure record for <strong style={{color: '#0f172a'}}>"{expenseToDelete.title}"</strong> (₹{expenseToDelete.amount?.toLocaleString()})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button style={{ flex: '1', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer' }} onClick={() => setExpenseToDelete(null)}>
                Keep Record
              </button>
              <button style={{ flex: '1', padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }} onClick={confirmDeleteExpense}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Notification Modal */}
      {successMsg && createPortal(
        <div className="modal-overlay" onClick={() => setSuccessMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#10b981', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <CheckCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Success!</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>{successMsg}</p>
            <button className="btn-primary" style={{ background: '#10b981', border: 'none', color: '#ffffff', width: '100%', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }} onClick={() => setSuccessMsg('')}>
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Error Notification Modal */}
      {errorMsg && createPortal(
        <div className="modal-overlay" onClick={() => setErrorMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <AlertCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Action Failed</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>{errorMsg}</p>
            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', color: '#ffffff', width: '100%', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }} onClick={() => setErrorMsg('')}>
              Okay
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Full Bill Image Preview Modal */}
      {previewImageSrc && createPortal(
        <div className="modal-overlay" onClick={() => setPreviewImageSrc('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '600px', borderRadius: '28px', padding: '24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '850', margin: 0 }}>Expenditure Receipt / Bill Attachment</h3>
              <button onClick={() => setPreviewImageSrc('')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ overflow: 'auto', maxHeight: '70vh', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '4px', background: '#f8fafc' }}>
              {previewImageSrc.startsWith('data:application/pdf') ? (
                <iframe 
                  src={previewImageSrc} 
                  width="100%" 
                  height="500px" 
                  style={{ border: 'none', borderRadius: '12px' }}
                  title="PDF Attachment Viewer"
                />
              ) : (
                <img 
                  src={previewImageSrc} 
                  alt="Receipt Attachment" 
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', display: 'block', margin: '0 auto' }}
                />
              )}
            </div>

            <button 
              className="btn-primary" 
              style={{ background: '#4f46e5', border: 'none', color: '#ffffff', width: '100%', padding: '14px', borderRadius: '16px', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', marginTop: '20px', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }} 
              onClick={() => setPreviewImageSrc('')}
            >
              Close Preview
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageExpenses;
