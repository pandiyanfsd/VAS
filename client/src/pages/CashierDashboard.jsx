import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  Coins, 
  LogOut, 
  Menu, 
  X, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Receipt,
  User,
  ArrowRight,
  RefreshCw,
  Lock,
  Edit,
  Trash2,
  Camera,
  Upload,
  Zap,
  CheckCircle2,
  FileText,
  Plus
} from 'lucide-react';
import './AdminDashboard.css'; // Reuses structural sidebar layouts
import ManageExpenses from '../components/ManageExpenses';
import { parsePaymentPhoto } from '../utils/ocrPaymentParser';

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('collect'); // collect, receipts, handovers, expenses
  const [cashier, setCashier] = useState(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState({ type: '', message: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  
  // Financial metrics
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalSurrendered: 0,
    cashInHand: 0
  });

  // Search & Member Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [unpaidDues, setUnpaidDues] = useState([]);
  const [loadingDues, setLoadingDues] = useState(false);

  // All dues (for totals)
  const [allDues, setAllDues] = useState([]);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isDateInDuration = (dateVal, durationMode) => {
    if (!dateVal) return false;
    const dDate = new Date(dateVal);
    const today = new Date();
    
    // Set hours to 0 to compare dates accurately
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    if (durationMode === 'today') {
      return dDate >= todayStart && dDate < tomorrowStart;
    }
    
    if (durationMode === 'week') {
      const dayOfWeek = today.getDay();
      const sundayStart = new Date(todayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      return dDate >= sundayStart && dDate < tomorrowStart;
    }
    
    if (durationMode === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return dDate >= firstOfMonth && dDate < tomorrowStart;
    }

    if (durationMode === 'custom') {
      if (!donationStartDate && !donationEndDate) return true;
      const start = donationStartDate ? new Date(donationStartDate) : new Date(0);
      const end = donationEndDate ? new Date(donationEndDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return dDate >= start && dDate <= end;
    }

    return true; // 'all'
  };

  // Payment Form State
  const [paymentSplits, setPaymentSplits] = useState({});
  const [selectedFunds, setSelectedFunds] = useState({});
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);

  // Allotment mode
  const [allotmentMode, setAllotmentMode] = useState('auto'); // 'auto' | 'manual'
  const [autoAmount, setAutoAmount] = useState('');
  const [autoSplitPreview, setAutoSplitPreview] = useState([]);
  const [showAutoPreview, setShowAutoPreview] = useState(false);

  // Manual mode filters
  const [fundTypeFilter, setFundTypeFilter] = useState('all');
  const [fundNameSearch, setFundNameSearch] = useState('');

  // History Lists
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [handoverHistory, setHandoverHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Detailed Stats Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState('allotted'); // 'allotted' | 'paid' | 'outstanding'
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Donations State
  const [donations, setDonations] = useState([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({
    name: '',
    date: getTodayDateString(),
    amount: '',
    address: '',
    purpose: localStorage.getItem('last_donation_purpose') || ''
  });
  const [donationError, setDonationError] = useState('');
  const [donationSuccess, setDonationSuccess] = useState('');
  const [filterDonationPurpose, setFilterDonationPurpose] = useState('all');
  const [submittingDonation, setSubmittingDonation] = useState(false);
  const [showPurposeSuggestions, setShowPurposeSuggestions] = useState(false);
  const [editingDonationId, setEditingDonationId] = useState(null);
  const [filterDonationDuration, setFilterDonationDuration] = useState('all');
  const [donationStartDate, setDonationStartDate] = useState('');
  const [donationEndDate, setDonationEndDate] = useState('');

  // Custom Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    type: 'primary'
  });

  // Photo Payment Upload & Approval Modal States
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoMetadata, setPhotoMetadata] = useState(null);
  const [photoTotalAmount, setPhotoTotalAmount] = useState('');
  const [photoPaymentMode, setPhotoPaymentMode] = useState('upi');
  const [photoPaymentDate, setPhotoPaymentDate] = useState(getTodayDateString());
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoMembers, setPhotoMembers] = useState([]);
  const [photoSearchTerm, setPhotoSearchTerm] = useState('');
  const [processingPhotoBatch, setProcessingPhotoBatch] = useState(false);
  const [batchReceiptsResult, setBatchReceiptsResult] = useState(null);
  const [showBatchSuccessModal, setShowBatchSuccessModal] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoZoom, setPhotoZoom] = useState(false);

  // Pagewise document review states
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [photoPages, setPhotoPages] = useState([]);

  // Handle Photo File Selection & OCR parsing
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoFile(file);
    try {
      const parsed = await parsePaymentPhoto(file);
      setPhotoMetadata(parsed);
      setPhotoTotalAmount(parsed.extractedAmount || '');
      setPhotoPaymentMode(parsed.paymentMode || 'upi');
      setPhotoNotes(parsed.referenceNo ? `UTR/Ref: ${parsed.referenceNo}` : '');
      setPhotoPaymentDate(parsed.detectedDate || getTodayDateString());

      const initialPages = (parsed.pages || []).map(p => ({
        pageNum: p.pageNum,
        pageTotalAmount: p.extractedAmount || 2400,
        paymentMode: p.paymentMode || 'upi',
        paymentDate: p.paymentDate || getTodayDateString(),
        notes: p.referenceNo ? `UTR/Ref: ${p.referenceNo}` : '',
        extractedId: p.extractedId || '',
        extractedMonth: p.extractedMonth || '',
        extractedYear: p.extractedYear || '',
        members: [],
        isApproved: false
      }));

      const finalPages = initialPages.length > 0 ? initialPages : [{
        pageNum: 1,
        pageTotalAmount: parsed.extractedAmount || 2400,
        paymentMode: parsed.paymentMode || 'upi',
        paymentDate: parsed.detectedDate || getTodayDateString(),
        notes: parsed.referenceNo ? `UTR/Ref: ${parsed.referenceNo}` : '',
        extractedId: parsed.extractedId || '',
        extractedMonth: parsed.extractedMonth || '',
        extractedYear: parsed.extractedYear || '',
        members: [],
        isApproved: false
      }];

      setPhotoPages(finalPages);
      setCurrentPageIndex(0);

      // If a member was currently selected on dashboard, auto-add them
      if (selectedMember && photoMembers.length === 0) {
        handleAddMemberToPhoto(selectedMember, parsed.extractedAmount || 2400);
      }
    } catch (err) {
      console.error("Error parsing photo receipt", err);
      setPhotoError("Failed to parse photo receipt file.");
    }
  };

  // Pagewise Navigation Handlers with State Preservation
  const handleSwitchPage = (targetIdx) => {
    if (targetIdx < 0 || targetIdx >= photoPages.length) return;

    // 1. Save current page state
    setPhotoPages(prevPages => prevPages.map((pg, idx) => {
      if (idx === currentPageIndex) {
        return {
          ...pg,
          pageTotalAmount: photoTotalAmount,
          paymentMode: photoPaymentMode,
          paymentDate: photoPaymentDate,
          notes: photoNotes,
          members: photoMembers
        };
      }
      return pg;
    }));

    // 2. Load target page state
    const targetPage = photoPages[targetIdx];
    if (targetPage) {
      setCurrentPageIndex(targetIdx);
      setPhotoTotalAmount(targetPage.pageTotalAmount || '');
      setPhotoPaymentMode(targetPage.paymentMode || 'upi');
      setPhotoNotes(targetPage.notes || '');
      setPhotoPaymentDate(targetPage.paymentDate || getTodayDateString());
      setPhotoMembers(targetPage.members || []);
    }
  };

  const handleAddPage = () => {
    // Save current page state first
    setPhotoPages(prevPages => prevPages.map((pg, idx) => {
      if (idx === currentPageIndex) {
        return {
          ...pg,
          pageTotalAmount: photoTotalAmount,
          paymentMode: photoPaymentMode,
          paymentDate: photoPaymentDate,
          notes: photoNotes,
          members: photoMembers
        };
      }
      return pg;
    }));

    const newPageNum = photoPages.length + 1;
    const newPage = {
      pageNum: newPageNum,
      pageTotalAmount: 2400,
      paymentMode: 'upi',
      paymentDate: getTodayDateString(),
      notes: `Page ${newPageNum} Receipt`,
      extractedId: '',
      extractedMonth: '',
      extractedYear: '',
      members: [],
      isApproved: false
    };

    setPhotoPages(prev => [...prev, newPage]);
    setCurrentPageIndex(photoPages.length);
    setPhotoTotalAmount(2400);
    setPhotoPaymentMode('upi');
    setPhotoNotes(`Page ${newPageNum} Receipt`);
    setPhotoPaymentDate(getTodayDateString());
    setPhotoMembers([]);
  };

  // Add Member to Photo Payment List & Auto-Allocate
  const handleAddMemberToPhoto = async (memberToAdd, suggestedAmount) => {
    if (!memberToAdd) return;
    if (photoMembers.some(m => m.member._id === memberToAdd._id)) {
      setPhotoError(`${memberToAdd.name} is already added to this photo receipt.`);
      return;
    }
    setPhotoError('');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues/member/${memberToAdd._id}`);
      const unpaid = (res.data || []).filter(d => d.status !== 'paid');

      let targetAmt = suggestedAmount;
      if (!targetAmt) {
        const remainingToDistribute = Math.max(0, (parseFloat(photoTotalAmount) || 0) - photoMembers.reduce((sum, pm) => sum + (parseFloat(pm.amountAllocated) || 0), 0));
        targetAmt = remainingToDistribute > 0 ? remainingToDistribute : 2400;
      }

      const entry = {
        member: memberToAdd,
        unpaidDues: unpaid,
        amountAllocated: targetAmt,
        splits: {},
        selectedFunds: {}
      };

      autoAllocateMemberEntry(entry, targetAmt, unpaid);

      setPhotoMembers(prev => [...prev, entry]);
      setPhotoSearchTerm('');
    } catch (err) {
      console.error("Error loading dues for photo member", err);
      setPhotoError("Failed to load unpaid dues for selected member.");
    }
  };

  // Auto-Allocate an entry's allocated amount to its pending dues (oldest first)
  const autoAllocateMemberEntry = (entry, allocAmount, unpaidList) => {
    const sorted = [...(unpaidList || entry.unpaidDues || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let remaining = parseFloat(allocAmount) || 0;
    const newSplits = {};
    const newSelected = {};

    sorted.forEach(due => {
      if (remaining <= 0) return;
      const maxRem = due.totalDueAmount - due.amountPaid;
      const alloc = Math.min(remaining, maxRem);
      if (alloc > 0) {
        newSplits[due._id] = alloc;
        newSelected[due._id] = true;
        remaining -= alloc;
      }
    });

    entry.splits = newSplits;
    entry.selectedFunds = newSelected;
  };

  // Remove member from photo receipt list
  const handleRemoveMemberFromPhoto = (memberId) => {
    setPhotoMembers(prev => prev.filter(m => m.member._id !== memberId));
  };

  // Update a member's allocated total amount in photo payment
  const handleMemberPhotoAmountChange = (memberId, newAmt) => {
    setPhotoMembers(prev => prev.map(item => {
      if (item.member._id === memberId) {
        const updated = { ...item, amountAllocated: newAmt };
        autoAllocateMemberEntry(updated, newAmt, item.unpaidDues);
        return updated;
      }
      return item;
    }));
  };

  // Toggle fund selection for a member in photo payment
  const handleTogglePhotoMemberFund = (memberId, dueId) => {
    setPhotoMembers(prev => prev.map(item => {
      if (item.member._id === memberId) {
        const nextSel = { ...item.selectedFunds, [dueId]: !item.selectedFunds[dueId] };
        return { ...item, selectedFunds: nextSel };
      }
      return item;
    }));
  };

  // Change split amount for a specific fund of a member in photo payment
  const handlePhotoMemberFundSplitChange = (memberId, dueId, val, maxVal) => {
    let numericVal = val === '' ? '' : parseFloat(val);
    if (numericVal !== '' && (isNaN(numericVal) || numericVal < 0)) return;
    if (numericVal !== '' && numericVal > maxVal) numericVal = maxVal;

    setPhotoMembers(prev => prev.map(item => {
      if (item.member._id === memberId) {
        const nextSplits = { ...item.splits, [dueId]: numericVal };
        const sumAlloc = Object.keys(nextSplits).reduce((sum, id) => sum + (parseFloat(nextSplits[id]) || 0), 0);
        return { ...item, splits: nextSplits, amountAllocated: sumAlloc };
      }
      return item;
    }));
  };

  // Submit Photo Batch Payment for Cashier Approval
  const handleApprovePhotoBatchPayment = async () => {
    // Sync current active page state into photoPages
    const updatedPages = photoPages.map((pg, idx) => {
      if (idx === currentPageIndex) {
        return {
          ...pg,
          pageTotalAmount: photoTotalAmount,
          paymentMode: photoPaymentMode,
          paymentDate: photoPaymentDate,
          notes: photoNotes,
          members: photoMembers
        };
      }
      return pg;
    });

    const allPageMembers = updatedPages.flatMap(p => p.members || []);
    const sourceMembers = allPageMembers.length > 0 ? allPageMembers : photoMembers;

    if (sourceMembers.length === 0) {
      setPhotoError("Please add at least one villager member to allocate this document payment.");
      return;
    }

    const items = sourceMembers.map(pm => {
      const splitDetails = Object.keys(pm.splits)
        .filter(dueId => pm.selectedFunds[dueId] && pm.splits[dueId] > 0)
        .map(dueId => {
          const due = pm.unpaidDues.find(d => d._id === dueId);
          return {
            fundId: due?.fundId?._id,
            amountAllocated: parseFloat(pm.splits[dueId]) || 0
          };
        })
        .filter(s => s.fundId && s.amountAllocated > 0);

      const memberTotal = splitDetails.reduce((sum, s) => sum + s.amountAllocated, 0);

      return {
        memberId: pm.member._id,
        totalAmountPaid: memberTotal,
        splitDetails,
        notes: `Photo/PDF Upload [${photoMetadata?.fileName || 'slip'}] • Page Receipt • ${photoNotes || 'Approved by cashier'}`
      };
    }).filter(item => item.splitDetails.length > 0);

    if (items.length === 0) {
      setPhotoError("No valid fund amounts allocated. Please allocate funds for at least one member.");
      return;
    }

    setProcessingPhotoBatch(true);
    setPhotoError('');

    try {
      const payload = {
        items,
        cashierId: cashier._id,
        paymentMode: photoPaymentMode,
        paymentDate: photoPaymentDate,
        notes: photoNotes || `Photo Receipt Upload (${photoMetadata?.fileName || ''})`
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments/batch`, payload);

      setBatchReceiptsResult(res.data.receipts || []);
      setShowPhotoModal(false);
      setShowBatchSuccessModal(true);

      // Reset photo form state
      setPhotoFile(null);
      setPhotoMetadata(null);
      setPhotoMembers([]);
      setPhotoTotalAmount('');
      setPhotoNotes('');

      // Refresh financials
      fetchFinancials(cashier._id);
    } catch (err) {
      console.error("Error submitting photo batch payment", err);
      setPhotoError(err.response?.data?.error || "Failed to process photo payment batch.");
    } finally {
      setProcessingPhotoBatch(false);
    }
  };

  const showCustomConfirm = ({ title, message, confirmText, cancelText, onConfirm, type = 'primary' }) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      type
    });
  };

  const handleOpenDetailsModal = (type) => {
    setDetailsModalType(type);
    setModalSearchTerm('');
    setShowDetailsModal(true);
  };

  // 1. Verify Cashier Authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user');

    if (!token || role !== 'cashier' || !storedUser) {
      localStorage.clear();
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setCashier(parsedUser);
      fetchFinancials(parsedUser._id);
      fetchMembersList();
    }
  }, [navigate]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdStatus({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', message: 'Confirm password does not match.' });
      return;
    }

    if (newPassword.length < 5) {
      setPwdStatus({ type: 'error', message: 'Password must be at least 5 characters long.' });
      return;
    }

    setPwdLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/cashier/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPwdStatus({ type: 'success', message: res.data.message || 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('[CHANGE PASSWORD ERROR]:', err);
      setPwdStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update password. Verify your current password.'
      });
    } finally {
      setPwdLoading(false);
    }
  };

  // 2. Fetch Financial summaries & statistics for this cashier
  const fetchFinancials = async (cashierId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders/summary`);
      const myStats = res.data.find(c => c._id === cashierId);
      if (myStats) {
        setStats({
          totalCollected: myStats.totalCollected || 0,
          totalSurrendered: myStats.totalSurrendered || 0,
          cashInHand: myStats.cashInHand || 0
        });
      }
    } catch (error) {
      console.error("Error fetching cashier summary stats", error);
    }
  };

  const fetchMembersList = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`);
      setAllMembers(res.data || []);
    } catch (error) {
      console.error("Error fetching villagers list", error);
    }
  };

  // 3. Tab switching & history fetching
  useEffect(() => {
    if (!cashier) return;
    if (activeTab === 'receipts') {
      fetchReceipts();
    } else if (activeTab === 'handovers') {
      fetchHandovers();
    } else if (activeTab === 'donations') {
      fetchDonations();
    }
  }, [activeTab, cashier]);

  const fetchReceipts = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments?cashierId=${cashier._id}`);
      setReceiptHistory(res.data || []);
    } catch (error) {
      console.error("Error loading receipt history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchHandovers = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders`);
      // Filter handovers specifically recorded for this cashier
      const filtered = res.data.filter(h => h.cashierId?._id === cashier._id);
      setHandoverHistory(filtered);
    } catch (error) {
      console.error("Error loading handover history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchDonations = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations?cashierId=${cashier._id}`);
      setDonations(res.data || []);
    } catch (error) {
      console.error("Error loading donations", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRecordDonation = (e) => {
    e.preventDefault();
    if (!cashier) return;
    setDonationError('');
    setDonationSuccess('');

    if (!donationForm.name.trim()) {
      setDonationError('Donor Name is required.');
      return;
    }
    if (!donationForm.amount || parseFloat(donationForm.amount) <= 0) {
      setDonationError('Enter a valid amount greater than ₹0.');
      return;
    }
    if (!donationForm.address.trim()) {
      setDonationError('Address is required.');
      return;
    }
    if (!donationForm.purpose.trim()) {
      setDonationError('Purpose is required.');
      return;
    }

    const actionWord = editingDonationId ? "update" : "record";
    showCustomConfirm({
      title: editingDonationId ? "Update Donation Record" : "Save Donation Record",
      message: `Are you sure you want to ${actionWord} this donation of ₹${donationForm.amount} from ${donationForm.name.toUpperCase()} for ${donationForm.purpose.toUpperCase()}?`,
      confirmText: editingDonationId ? "Yes, Update" : "Yes, Save",
      type: 'primary',
      onConfirm: async () => {
        setSubmittingDonation(true);
        try {
          const payload = {
            name: donationForm.name.toUpperCase(),
            date: donationForm.date,
            amount: Number(donationForm.amount),
            address: donationForm.address.toUpperCase(),
            purpose: donationForm.purpose.toUpperCase(),
            cashierId: cashier._id
          };

          if (editingDonationId) {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations/${editingDonationId}`, payload);
            setDonationSuccess('Donation updated successfully!');
          } else {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations`, payload);
            setDonationSuccess('Donation recorded successfully!');
          }
          
          // Save last used purpose for reuse
          localStorage.setItem('last_donation_purpose', donationForm.purpose.toUpperCase());
          
          // Reset form, reusing purpose
          setDonationForm({
            name: '',
            date: getTodayDateString(),
            amount: '',
            address: '',
            purpose: donationForm.purpose.toUpperCase()
          });
          setEditingDonationId(null);

          // Close modal after brief timeout
          setTimeout(() => {
            setShowDonationModal(false);
            setDonationSuccess('');
          }, 1500);

          // Refresh list
          fetchDonations();
        } catch (err) {
          console.error("Error saving donation", err);
          setDonationError(err.response?.data?.error || 'Failed to save donation. Please try again.');
        } finally {
          setSubmittingDonation(false);
        }
      }
    });
  };

  const handleDeleteDonation = (id) => {
    showCustomConfirm({
      title: "Delete Donation Record",
      message: "Are you sure you want to delete this donation record? This action cannot be undone.",
      confirmText: "Yes, Delete",
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations/${id}`);
          fetchDonations();
        } catch (err) {
          console.error("Error deleting donation", err);
          alert(err.response?.data?.error || "Failed to delete donation record.");
        }
      }
    });
  };

  const handleEditDonationClick = (donation) => {
    setEditingDonationId(donation._id);
    let dateStr = getTodayDateString();
    if (donation.date) {
      if (typeof donation.date === 'string') {
        dateStr = donation.date.split('T')[0];
      } else if (donation.date instanceof Date) {
        dateStr = donation.date.toISOString().split('T')[0];
      }
    }
    setDonationForm({
      name: donation.name ? donation.name.toUpperCase() : '',
      date: dateStr,
      amount: donation.amount || '',
      address: donation.address ? donation.address.toUpperCase() : '',
      purpose: donation.purpose ? donation.purpose.toUpperCase() : ''
    });
    setDonationError('');
    setDonationSuccess('');
    setShowDonationModal(true);
  };

  // 4. Look up specific member dues
  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    setSearchTerm('');
    setLoadingDues(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowAutoPreview(false);
    setAutoAmount('');
    setAllotmentMode('auto');
    setFundTypeFilter('all');
    setFundNameSearch('');
    setPaymentDate(getTodayDateString());
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues/member/${member._id}`);
      const all = res.data;
      const unpaid = all.filter(d => d.status !== 'paid');
      setAllDues(all);
      setUnpaidDues(unpaid);
      const initialSplits = {};
      const initialSelected = {};
      unpaid.forEach(due => {
        const maxRem = due.totalDueAmount - due.amountPaid;
        initialSplits[due._id] = maxRem;
        initialSelected[due._id] = true;
      });
      setPaymentSplits(initialSplits);
      setSelectedFunds(initialSelected);
    } catch (error) {
      setErrorMsg("Failed to load outstanding dues for this villager.");
    } finally {
      setLoadingDues(false);
    }
  };

  // Auto Allotment: distribute entered amount across dues — oldest dues first
  const calcAutoAllotment = () => {
    const total = parseFloat(autoAmount);
    if (isNaN(total) || total <= 0) { setErrorMsg('Enter a valid amount greater than ₹0.'); return; }
    setErrorMsg('');
    let remaining = total;
    // Sort by createdAt ascending so oldest dues are paid first
    const sorted = [...unpaidDues].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const splits = [];
    for (const due of sorted) {
      if (remaining <= 0) break;
      const maxRem = due.totalDueAmount - due.amountPaid;
      const allocate = Math.min(remaining, maxRem);
      if (allocate > 0) { splits.push({ due, allocate }); remaining -= allocate; }
    }
    if (splits.length === 0) { setErrorMsg('No outstanding dues to allocate against.'); return; }
    setAutoSplitPreview(splits);
    setShowAutoPreview(true);
  };

  // Confirm and submit auto allotment
  const confirmAutoPayment = () => {
    const splitDetails = autoSplitPreview.map(s => ({ fundId: s.due.fundId._id, amountAllocated: s.allocate }));
    setPaymentToConfirm({
      mode: 'auto',
      payload: {
        memberId: selectedMember._id, cashierId: cashier._id, paymentSource: 'cashier',
        paymentMode, splitDetails, notes: paymentNotes || 'Auto-Allotment Payment',
        paymentDate: paymentDate
      },
      total: autoSplitPreview.reduce((s, x) => s + x.allocate, 0)
    });
  };

  const handleSplitAmountChange = (dueId, val, maxVal) => {
    let numericVal = val === '' ? '' : parseFloat(val);
    if (numericVal !== '' && (isNaN(numericVal) || numericVal < 0)) return;
    if (numericVal !== '' && numericVal > maxVal) numericVal = maxVal;
    
    setPaymentSplits({ ...paymentSplits, [dueId]: numericVal });
  };

  const getCheckedTotal = () => {
    return Object.keys(paymentSplits).reduce((sum, dueId) => {
      if (selectedFunds[dueId]) {
        return sum + (parseFloat(paymentSplits[dueId]) || 0);
      }
      return sum;
    }, 0);
  };

  // Helper: build full fund display name e.g. "MAINTENANCE FUND Jan 2026"
  const fundDisplayName = (fundId) => {
    if (!fundId) return 'Unknown Fund';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = fundId.month ? MONTHS[fundId.month - 1] : '';
    const year = fundId.year || '';
    const suffix = [month, year].filter(Boolean).join(' ');
    return suffix ? `${fundId.name} ${suffix}` : fundId.name;
  };

  // 5. Submit dynamic split payments
  const handleProcessPayment = (e) => {
    e.preventDefault();
    if (!selectedMember || !cashier) return;

    const totalToPay = getCheckedTotal();
    if (totalToPay <= 0) {
      setErrorMsg("Please allocate a valid payment amount greater than ₹0.");
      return;
    }

    // Format splitDetails list
    const splitDetails = Object.keys(paymentSplits)
      .filter(dueId => selectedFunds[dueId])
      .map(dueId => {
        const amount = parseFloat(paymentSplits[dueId]) || 0;
        const due = unpaidDues.find(d => d._id === dueId);
        return {
          fundId: due?.fundId?._id,
          amountAllocated: amount
        };
      })
      .filter(split => split.fundId && split.amountAllocated > 0);

    setPaymentToConfirm({
      mode: 'manual',
      payload: {
        memberId: selectedMember._id,
        cashierId: cashier._id,
        paymentSource: 'cashier',
        paymentMode,
        splitDetails,
        notes: paymentNotes || 'Counter Payment',
        paymentDate: paymentDate
      },
      total: totalToPay
    });
  };

  const executeConfirmedPayment = async () => {
    if (!paymentToConfirm) return;
    setProcessingPayment(true);
    setErrorMsg('');
    try {
      const payload = { ...paymentToConfirm.payload };
      const dateStr = payload.paymentDate || getTodayDateString();
      const [year, month, day] = dateStr.split('-').map(Number);
      const now = new Date();
      const localPaymentDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      payload.paymentDate = localPaymentDate.toISOString();

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments`, payload);
      
      // Show receipt modal immediately
      setCurrentReceipt(res.data.receipt);
      setShowReceiptModal(true);
      
      // Clear payment selections & reload
      setSuccessMsg("Payment processed successfully! Receipt generated.");
      setPaymentNotes('');
      setPaymentDate(getTodayDateString());
      setSelectedMember(null);
      setUnpaidDues([]);
      setShowAutoPreview(false);
      setAutoAmount('');
      setPaymentToConfirm(null);
      
      // Refresh financials
      fetchFinancials(cashier._id);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Transaction failed. Please verify dues allocation.");
      setPaymentToConfirm(null);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Autocomplete search suggestions — by Name or Family ID only
  const filteredSuggestions = searchTerm.trim() === '' ? [] : allMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.familyId && m.familyId.toString().includes(searchTerm))
  ).slice(0, 5);

  // Autocomplete suggestions for donation purpose (matching spellings)
  const matchingPurposes = donationForm.purpose.trim() === ''
    ? []
    : [...new Set(donations.map(d => d.purpose).filter(Boolean))]
        .filter(p => p.toLowerCase().includes(donationForm.purpose.toLowerCase()) && p.toLowerCase() !== donationForm.purpose.toLowerCase())
        .slice(0, 5);

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2>Denalai Cashier</h2>
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Denalai Cashier</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('collect'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'collect' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <CreditCard size={20} />
            <span>Collect Payments</span>
          </button>

          <button 
            onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Receipt size={20} />
            <span>Receipt History</span>
          </button>

          <button 
            onClick={() => { setActiveTab('handovers'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'handovers' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Coins size={20} />
            <span>Cash Handovers</span>
          </button>

          <button 
            onClick={() => { setActiveTab('expenses'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Receipt size={20} />
            <span>Manage Expenses</span>
          </button>

          <button 
            onClick={() => { setActiveTab('donations'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'donations' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Coins size={20} />
            <span>Collect Donations</span>
          </button>

          <button 
            onClick={() => { setActiveTab('password'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'password' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Lock size={20} />
            <span>Update Password</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'collect' && 'Collect Outstanding Dues'}
            {activeTab === 'receipts' && 'My Receipt Logs'}
            {activeTab === 'handovers' && 'My Treasury Handovers'}
            {activeTab === 'expenses' && 'Manage Expenses'}
            {activeTab === 'donations' && 'Collect General Donations'}
            {activeTab === 'password' && 'Account Security & Password'}
          </h1>
          <div className="user-profile">
            <div className="avatar" style={{ background: '#38bdf8' }}>C</div>
            <span>{cashier?.name || 'Cashier Counter'}</span>
          </div>
        </header>

        <div className="content-body animate-fade-in">
          
          {/* 1. Real-time Cashier Treasury Stats Banner */}
          {activeTab !== 'collect' && activeTab !== 'expenses' && activeTab !== 'password' && activeTab !== 'donations' && (
            <div className="demographic-banner glass-panel mb-6 treasury-banner" style={{ 
              background: activeTab === 'receipts' 
                ? 'linear-gradient(135deg, #1e1b4b 0%, #31115a 100%)' // Premium Dark Purple/Plum theme
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Dark blue-slate theme
              color: '#f8fafc', 
              padding: '24px', 
              borderRadius: '20px', 
              border: activeTab === 'receipts'
                ? '1px solid rgba(232, 121, 249, 0.25)' 
                : '1px solid rgba(255, 255, 255, 0.15)', 
              boxShadow: activeTab === 'receipts'
                ? '0 20px 25px -5px rgba(49, 17, 90, 0.4)' 
                : '0 20px 25px -5px rgba(0, 0, 0, 0.3)' 
            }}>
              <div className="demo-card" style={{ padding: '16px', background: activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span className="demo-icon"><CreditCard size={20} color={activeTab === 'receipts' ? '#e879f9' : '#38bdf8'} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#d8b4fe' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Total Collected</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: activeTab === 'receipts' ? '#e879f9' : '#38bdf8', fontWeight: '800' }}>₹{stats.totalCollected.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: activeTab === 'receipts' ? '#a5b4fc' : '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>Gross revenue processed</span>
              </div>
              <div className="demo-card" style={{ padding: '16px', background: activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span className="demo-icon"><Coins size={20} color={activeTab === 'receipts' ? '#22d3ee' : '#34d399'} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#c8f2fa' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Handed Over</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: activeTab === 'receipts' ? '#22d3ee' : '#34d399', fontWeight: '800' }}>₹{stats.totalSurrendered.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: activeTab === 'receipts' ? '#818cf8' : '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>Settled with treasury admin</span>
              </div>
              <div className="demo-card" style={{ padding: '16px', background: stats.cashInHand > 0 ? 'rgba(249, 115, 22, 0.1)' : (activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(16, 185, 129, 0.05)'), borderRadius: '16px', border: stats.cashInHand > 0 ? '1px solid rgba(249, 115, 22, 0.2)' : (activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)') }}>
                <span className="demo-icon"><Coins size={20} color={stats.cashInHand > 0 ? '#fbbf24' : (activeTab === 'receipts' ? '#f472b6' : '#34d399')} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#fbcfe8' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Cash In Hand</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: stats.cashInHand > 0 ? '#fbbf24' : (activeTab === 'receipts' ? '#f472b6' : '#34d399'), fontWeight: '800' }}>₹{stats.cashInHand.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: stats.cashInHand > 0 ? '#f59e0b' : (activeTab === 'receipts' ? '#f472b6' : '#10b981'), display: 'block', marginTop: '4px', fontWeight: '800' }}>
                  {stats.cashInHand > 0 ? '⚠️ Pending settlement' : (activeTab === 'receipts' ? '✅ Account clear' : '✅ Account clear')}
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: Collect payments */}
          {activeTab === 'collect' && (
            <div>
              {/* Member Lookup Bar */}
              <div className="glass-panel p-6 mb-6" style={{ borderRadius: '20px', background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800', margin: 0, paddingLeft: '4px' }}>Lookup Villager Profile</h3>
                  
                  <button
                    onClick={() => { setShowPhotoModal(true); setPhotoError(''); }}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Camera size={18} /> Record Photo Payment (New)
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 16px' }}>
                      <Search size={18} color="#64748b" style={{ marginRight: '10px' }} />
                      <input 
                        type="text" 
                        placeholder="Search by Villager Name or Family ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', padding: '12px 0', width: '100%', fontSize: '0.95rem', fontWeight: '600' }}
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {/* Suggestions Autocomplete */}
                    {filteredSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '8px', overflow: 'hidden' }}>
                        {filteredSuggestions.map(member => (
                          <div 
                            key={member._id}
                            onClick={() => handleSelectMember(member)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{member.name}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Family #{member.familyId}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#4f46e5', fontWeight: '800', padding: '4px 8px', borderRadius: '6px' }}>
                              Fam ID: {member.familyId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Notifications */}
              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', fontWeight: '700' }}>
                  <AlertCircle size={20} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '24px', fontWeight: '700' }}>
                  <CheckCircle size={20} /> {successMsg}
                </div>
              )}

              {/* Outstanding Dues Billing Form */}
              {selectedMember && (
                <div className="glass-panel p-8" style={{ borderRadius: '24px', background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  
                  {/* Selected Member Profile Head */}
                  <div className="responsive-footer-row" style={{ paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '4px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                        <User size={24} style={{ margin: '0 auto' }} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>{selectedMember.name}</h2>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Family ID: #{selectedMember.familyId}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedMember(null)}
                      className="btn-clear-villager"
                    >
                      Clear Villager
                    </button>
                  </div>

                  {loadingDues ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <RefreshCw size={32} style={{ margin: '0 auto 10px auto' }} />Loading outstanding dues...
                    </div>
                  ) : (
                    <>
                      {/* Totals Summary Row */}
                      {(() => {
                        const totalAllotted = allDues.reduce((s, d) => s + d.totalDueAmount, 0);
                        const totalPaid = allDues.reduce((s, d) => s + d.amountPaid, 0);
                        const totalOutstanding = totalAllotted - totalPaid;
                        return (
                          <div className="totals-summary-row" style={{ marginBottom: '22px' }}>
                            <div 
                              className="clickable-stat-card allotted"
                              onClick={() => handleOpenDetailsModal('allotted')}
                              style={{ background: 'rgba(79,70,229,0.07)', borderRadius: '14px', padding: '14px 18px', border: '1px solid rgba(79,70,229,0.15)' }}
                              title="Click to view total allotted details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Allotted</span>
                              <strong style={{ fontSize: '1.5rem', color: '#4f46e5', fontWeight: '900' }}>₹{totalAllotted.toLocaleString()}</strong>
                            </div>
                            <div 
                              className="clickable-stat-card paid"
                              onClick={() => handleOpenDetailsModal('paid')}
                              style={{ background: 'rgba(16,185,129,0.07)', borderRadius: '14px', padding: '14px 18px', border: '1px solid rgba(16,185,129,0.15)' }}
                              title="Click to view total paid details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Paid</span>
                              <strong style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: '900' }}>₹{totalPaid.toLocaleString()}</strong>
                            </div>
                            <div 
                              className={`clickable-stat-card outstanding-${totalOutstanding > 0 ? 'warning' : 'success'}`}
                              onClick={() => handleOpenDetailsModal('outstanding')}
                              style={{ background: totalOutstanding > 0 ? 'rgba(225,29,72,0.07)' : 'rgba(16,185,129,0.05)', borderRadius: '14px', padding: '14px 18px', border: `1px solid ${totalOutstanding > 0 ? 'rgba(225,29,72,0.15)' : 'rgba(16,185,129,0.1)'}` }}
                              title="Click to view outstanding dues details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Outstanding Dues</span>
                              <strong style={{ fontSize: '1.5rem', color: totalOutstanding > 0 ? '#e11d48' : '#10b981', fontWeight: '900' }}>₹{totalOutstanding.toLocaleString()}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {unpaidDues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.1)', color: '#059669', fontWeight: '700' }}>
                          🎉 All dues settled for this villager!
                        </div>
                      ) : (
                        <>
                          {/* Mode Toggle */}
                          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
                            <button type="button" onClick={() => { setAllotmentMode('auto'); setShowAutoPreview(false); }}
                              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: allotmentMode === 'auto' ? '#4f46e5' : 'transparent', color: allotmentMode === 'auto' ? '#fff' : '#64748b' }}>
                              ⚡ Auto Allotment
                            </button>
                            <button type="button" onClick={() => { setAllotmentMode('manual'); setShowAutoPreview(false); }}
                              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: allotmentMode === 'manual' ? '#4f46e5' : 'transparent', color: allotmentMode === 'manual' ? '#fff' : '#64748b' }}>
                              ✏️ Manual Selection
                            </button>
                          </div>

                          {/* AUTO ALLOTMENT MODE */}
                          {allotmentMode === 'auto' && !showAutoPreview && (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px', fontWeight: '600' }}>
                                Enter the total amount to pay. The system will automatically distribute it across outstanding dues — <strong style={{ color: '#4f46e5' }}>oldest dues are settled first</strong>, then progressively to newer ones.
                              </p>
                              <div className="responsive-flex-row">
                                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '2px solid #4f46e5', borderRadius: '12px', padding: '4px 16px', flex: 1 }}>
                                  <span style={{ color: '#4f46e5', fontWeight: '900', fontSize: '1.2rem', marginRight: '8px' }}>₹</span>
                                  <input type="number" min="1" value={autoAmount} onChange={e => setAutoAmount(e.target.value)}
                                    placeholder="Enter total amount..."
                                    style={{ border: 'none', outline: 'none', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', width: '100%', padding: '10px 0' }} />
                                </div>
                                <button type="button" onClick={calcAutoAllotment}
                                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  Preview Allotment →
                                </button>
                              </div>
                            </div>
                          )}

                          {/* AUTO PREVIEW CONFIRMATION */}
                          {allotmentMode === 'auto' && showAutoPreview && (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '24px', border: '2px solid #4f46e5', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>⚡ Allotment Preview — Please Confirm</h4>
                                <button type="button" onClick={() => setShowAutoPreview(false)}
                                  style={{ background: '#f1f5f9', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}>
                                  ← Modify
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {autoSplitPreview.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                      <strong style={{ color: '#0f172a' }}>{fundDisplayName(s.due.fundId)}</strong>
                                      <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Type: {s.due.fundId?.fundType || 'General'}</span>
                                    </div>
                                    <strong style={{ color: '#4f46e5', fontSize: '1.1rem' }}>₹{s.allocate.toLocaleString()}</strong>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef2ff', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px' }}>
                                <span style={{ fontWeight: '800', color: '#3730a3' }}>Total Being Collected</span>
                                <strong style={{ fontSize: '1.3rem', color: '#4f46e5' }}>₹{autoSplitPreview.reduce((s, x) => s + x.allocate, 0).toLocaleString()}</strong>
                              </div>
                              <div className="responsive-grid-payment" style={{ marginBottom: '20px' }}>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Date</label>
                                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Channel</label>
                                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="cash">💵 Cash</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="card">💳 Card</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes</label>
                                  <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional notes..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>
                              <button type="button" onClick={confirmAutoPayment} disabled={processingPayment}
                                style={{ width: '100%', background: '#10b981', border: 'none', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {processingPayment ? 'Processing...' : <><CheckCircle size={18} /> Confirm & Process Payment</>}
                              </button>
                            </div>
                          )}

                          {/* MANUAL MODE */}
                          {allotmentMode === 'manual' && (
                            <form onSubmit={handleProcessPayment}>
                              {/* Fund Filters */}
                              <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Filter by Fund Type</label>
                                  <select value={fundTypeFilter} onChange={e => setFundTypeFilter(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="all">All Types</option>
                                    {[...new Set(unpaidDues.map(d => d.fundId?.fundType).filter(Boolean))].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ flex: 2, minWidth: '200px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Search Fund Name</label>
                                  <input type="text" value={fundNameSearch} onChange={e => setFundNameSearch(e.target.value)} placeholder="Type fund name..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>

                              {/* Filtered Dues List */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {(() => {
                                  const filteredDues = unpaidDues.filter(d => (fundTypeFilter === 'all' || d.fundId?.fundType === fundTypeFilter) && d.fundId?.name?.toLowerCase().includes(fundNameSearch.toLowerCase()));
                                  const allSelected = filteredDues.length > 0 && filteredDues.every(d => selectedFunds[d._id]);

                                  const handleSelectAll = (e) => {
                                    const isChecked = e.target.checked;
                                    const newSelected = { ...selectedFunds };
                                    filteredDues.forEach(d => {
                                      newSelected[d._id] = isChecked;
                                    });
                                    setSelectedFunds(newSelected);
                                  };

                                  return (
                                    <>
                                      {filteredDues.length > 0 && (
                                        <div style={{ padding: '0 10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <input type="checkbox" checked={allSelected} onChange={handleSelectAll} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                          <strong style={{ color: '#4f46e5', fontSize: '0.9rem' }}>Select All / Deselect All</strong>
                                        </div>
                                      )}
                                      {filteredDues.map(due => {
                                        const maxRem = due.totalDueAmount - due.amountPaid;
                                        const checked = selectedFunds[due._id] || false;
                                        const amt = paymentSplits[due._id] !== undefined ? paymentSplits[due._id] : '';
                                        return (
                                          <div key={due._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', border: checked ? '2px solid #4f46e5' : '1px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                              <input type="checkbox" checked={checked}
                                                onChange={e => setSelectedFunds({ ...selectedFunds, [due._id]: e.target.checked })}
                                                style={{ width: '20px', height: '20px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                              <div>
                                                <strong style={{ color: '#0f172a' }}>{fundDisplayName(due.fundId)}</strong>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: '700' }}>
                                                  {due.fundId?.fundType || 'General'} • Rem: ₹{maxRem} • Paid: ₹{due.amountPaid}
                                                </span>
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <strong style={{ color: '#e11d48' }}>₹{maxRem}</strong>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px', opacity: checked ? 1 : 0.5 }}>
                                                <span style={{ color: '#64748b', fontWeight: '700' }}>₹</span>
                                                <input type="number" min="0" max={maxRem} step="any" value={amt} placeholder="0" disabled={!checked}
                                                  onChange={e => handleSplitAmountChange(due._id, e.target.value, maxRem)}
                                                  style={{ width: '65px', border: 'none', outline: 'none', fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', textAlign: 'right', background: 'transparent' }} />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Payment channel + notes + submit */}
                              <div className="responsive-grid-payment" style={{ marginBottom: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Date</label>
                                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Channel</label>
                                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="cash">💵 Cash</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="card">💳 Card</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes</label>
                                  <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional notes..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>
                              <div className="responsive-footer-row" style={{ background: '#f1f5f9', padding: '18px 24px', borderRadius: '14px' }}>
                                <div>
                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Collecting</span>
                                  <strong style={{ fontSize: '1.7rem', color: '#4f46e5', fontWeight: '900' }}>₹{getCheckedTotal().toLocaleString()}</strong>
                                </div>
                                <button type="submit" disabled={processingPayment || getCheckedTotal() <= 0}
                                  style={{ background: '#4f46e5', border: 'none', color: 'white', padding: '14px 28px', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: getCheckedTotal() <= 0 ? 0.5 : 1 }}>
                                  {processingPayment ? 'Processing...' : <> Record Payment <ArrowRight size={18} /></>}
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {!selectedMember && (
                <div style={{ textAlign: 'center', padding: '60px 0', border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#64748b' }}>
                  <Search size={48} style={{ margin: '0 auto 15px auto', color: '#94a3b8' }} />
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: '800', marginBottom: '6px' }}>No Villager Selected</h3>
                  <p>Please enter their Name or Family ID in the lookup bar above to inspect outstanding dues.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Receipt History */}
          {activeTab === 'receipts' && (
            <div className="glass-panel p-8" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', marginBottom: '20px' }}>Your Collection Receipts History</h3>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 10px auto' }} />
                  Loading receipts database...
                </div>
              ) : receiptHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No collection receipts logged under your cashier ID yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Receipt #</th>
                        <th style={{ padding: '12px' }}>Villager Head</th>
                        <th style={{ padding: '12px' }}>Mode</th>
                        <th style={{ padding: '12px' }}>Funds Breakdown</th>
                        <th style={{ padding: '12px' }}>Amount Paid</th>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                      {receiptHistory.map(receipt => (
                        <tr key={receipt._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-scale">
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{ color: '#4f46e5', fontWeight: '800' }}>#{receipt.receiptNumber}</span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <strong style={{ color: '#0f172a' }}>{receipt.memberId?.name || 'Deleted Member'}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Fam ID: #{receipt.memberId?.familyId || 'N/A'}</span>
                          </td>
                          <td style={{ padding: '16px 12px', textTransform: 'uppercase' }}>{receipt.paymentMode}</td>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {receipt.splitDetails?.map((split, i) => (
                                <span key={i} style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  {split.fundId?.name || 'Fund'}: ₹{split.amountAllocated}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '1.05rem', color: '#10b981', fontWeight: '800' }}>
                            ₹{receipt.totalAmountPaid.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {new Date(receipt.paymentDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                            <button 
                              onClick={() => { setCurrentReceipt(receipt); setShowReceiptModal(true); }}
                              style={{ border: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#4f46e5' }}
                            >
                              <Printer size={14} /> Reprint
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Handovers History */}
          {activeTab === 'handovers' && (
            <div className="glass-panel p-8" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', marginBottom: '20px' }}>Your Cash Handovers to Administration</h3>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 10px auto' }} />
                  Loading handovers database...
                </div>
              ) : handoverHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No cash handover transactions settled under your cashier ID.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Transaction ID</th>
                        <th style={{ padding: '12px' }}>Amount Handed Over</th>
                        <th style={{ padding: '12px' }}>Received By</th>
                        <th style={{ padding: '12px' }}>Settlement Notes</th>
                        <th style={{ padding: '12px' }}>Handover Date</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                      {handoverHistory.map(tx => (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 12px', color: '#64748b' }}>#{tx._id}</td>
                          <td style={{ padding: '16px 12px', fontSize: '1.1rem', color: '#ea580c', fontWeight: '800' }}>
                            ₹{tx.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 12px' }}>👤 {tx.receivedByAdmin || 'Admin Treasury'}</td>
                          <td style={{ padding: '16px 12px', color: '#64748b' }}>{tx.notes}</td>
                          <td style={{ padding: '16px 12px' }}>
                            {new Date(tx.surrenderDate).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Manage Expenses */}
          {activeTab === 'expenses' && (
            <ManageExpenses isCashier={true} currentCashier={cashier} />
          )}

          {/* TAB 4.5: Collect Donations */}
          {activeTab === 'donations' && (
            <div className="glass-panel p-6 animate-fade-in" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                    Recorded General Donations
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                    Record and filter donations collected from the public.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDonationId(null);
                    setDonationForm({
                      name: '',
                      date: getTodayDateString(),
                      amount: '',
                      address: '',
                      purpose: localStorage.getItem('last_donation_purpose') || ''
                    });
                    setDonationError('');
                    setDonationSuccess('');
                    setShowDonationModal(true);
                  }}
                  style={{
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Coins size={16} /> Record Donation
                </button>
              </div>

              {/* Filters for Donations */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Filter by Purpose
                  </label>
                  <select
                    value={filterDonationPurpose}
                    onChange={(e) => setFilterDonationPurpose(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '700',
                      color: '#0f172a',
                      background: 'white',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Purposes</option>
                    {[...new Set(donations.map(d => d.purpose).filter(Boolean))].map(purpose => (
                      <option key={purpose} value={purpose}>{purpose}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Filter by Duration
                  </label>
                  <select
                    value={filterDonationDuration}
                    onChange={(e) => setFilterDonationDuration(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '700',
                      color: '#0f172a',
                      background: 'white',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {filterDonationDuration === 'custom' && (
                  <>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={donationStartDate}
                        onChange={(e) => setDonationStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '600',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={donationEndDate}
                        onChange={(e) => setDonationEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontWeight: '600',
                          color: '#0f172a',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Donation Metrics Banner */}
              {(() => {
                const overallTotal = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
                const purposeWiseTotal = donations
                  .filter(d => filterDonationPurpose === 'all' || d.purpose === filterDonationPurpose)
                  .reduce((sum, d) => sum + (d.amount || 0), 0);
                const durationWiseTotal = donations
                  .filter(d => isDateInDuration(d.date, filterDonationDuration))
                  .reduce((sum, d) => sum + (d.amount || 0), 0);
                const combinedFilteredTotal = donations
                  .filter(d => (filterDonationPurpose === 'all' || d.purpose === filterDonationPurpose) && isDateInDuration(d.date, filterDonationDuration))
                  .reduce((sum, d) => sum + (d.amount || 0), 0);

                return (
                  <div className="totals-summary-row" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(79, 70, 229, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(79, 70, 229, 0.12)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Overall Total Collected</span>
                      <strong style={{ fontSize: '1.4rem', color: '#4f46e5', fontWeight: '900' }}>₹{overallTotal.toLocaleString('en-IN')}</strong>
                    </div>

                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Purpose-Wise Total</span>
                      <strong style={{ fontSize: '1.4rem', color: '#10b981', fontWeight: '900' }}>
                        ₹{purposeWiseTotal.toLocaleString('en-IN')}
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginTop: '2px', textTransform: 'none' }}>
                          {filterDonationPurpose === 'all' ? '(All Purposes)' : `(Purpose: "${filterDonationPurpose}")`}
                        </span>
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(232, 121, 249, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(232, 121, 249, 0.12)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Duration-Wise Total</span>
                      <strong style={{ fontSize: '1.4rem', color: '#d946ef', fontWeight: '900' }}>
                        ₹{durationWiseTotal.toLocaleString('en-IN')}
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', display: 'block', marginTop: '2px', textTransform: 'none' }}>
                          {filterDonationDuration === 'all' && '(All Time)'}
                          {filterDonationDuration === 'today' && '(Today)'}
                          {filterDonationDuration === 'week' && '(This Week)'}
                          {filterDonationDuration === 'month' && '(This Month)'}
                          {filterDonationDuration === 'custom' && `(${donationStartDate || 'Start'} to ${donationEndDate || 'End'})`}
                        </span>
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(249, 115, 22, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(249, 115, 22, 0.12)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Combined Filtered Total</span>
                      <strong style={{ fontSize: '1.4rem', color: '#f97316', fontWeight: '900' }}>₹{combinedFilteredTotal.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Donations Table */}
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 10px auto' }} />
                  Loading donations ledger...
                </div>
              ) : donations.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontWeight: '600' }}>
                  No donations recorded yet by you. Click "Record Donation" to add one.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 10px' }}>Donor Name</th>
                        <th style={{ padding: '12px 10px' }}>Purpose</th>
                        <th style={{ padding: '12px 10px' }}>Amount</th>
                        <th style={{ padding: '12px 10px' }}>Address</th>
                        <th style={{ padding: '12px 10px' }}>Date</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                      {donations
                        .filter(d => (filterDonationPurpose === 'all' || d.purpose === filterDonationPurpose) && isDateInDuration(d.date, filterDonationDuration))
                        .map((d, index) => (
                          <tr key={d._id || index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#f8fafc' : 'white' }}>
                            <td style={{ padding: '14px 10px', fontWeight: '700' }}>{d.name}</td>
                            <td style={{ padding: '14px 10px' }}>
                              <span style={{ background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                {d.purpose}
                              </span>
                            </td>
                            <td style={{ padding: '14px 10px', color: '#10b981', fontWeight: '800' }}>₹{d.amount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '14px 10px', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.address}>
                              {d.address}
                            </td>
                            <td style={{ padding: '14px 10px', color: '#64748b' }}>{new Date(d.date).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button 
                                  onClick={() => handleEditDonationClick(d)}
                                  style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: '4px' }}
                                  title="Edit Donation"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDonation(d._id)}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                  title="Delete Donation"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Record Donation Modal */}
              {showDonationModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
                  <div className="glass-panel p-8 animate-scale-up" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '950', color: '#0f172a' }}>
                        {editingDonationId ? "Edit Donation Record" : "Record General Donation"}
                      </h3>
                      <button onClick={() => {
                        setShowDonationModal(false);
                        setEditingDonationId(null);
                        setDonationForm({
                          name: '',
                          date: getTodayDateString(),
                          amount: '',
                          address: '',
                          purpose: localStorage.getItem('last_donation_purpose') || ''
                        });
                        setDonationError('');
                        setDonationSuccess('');
                      }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                      </button>
                    </div>

                    {donationError && (
                      <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px', background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                        <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {donationError}
                      </div>
                    )}
                    {donationSuccess && (
                      <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px', background: '#ecfdf5', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {donationSuccess}
                      </div>
                    )}

                    <form onSubmit={handleRecordDonation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Donor Name</label>
                        <input
                          type="text"
                          required
                          value={donationForm.name}
                          onChange={(e) => setDonationForm({ ...donationForm, name: e.target.value.toUpperCase() })}
                          placeholder="e.g. JOHN DOE"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Amount (₹)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={donationForm.amount}
                            onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                            placeholder="e.g. 500"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Collection Date</label>
                          <input
                            type="date"
                            required
                            value={donationForm.date}
                            onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Address</label>
                        <input
                          type="text"
                          required
                          value={donationForm.address}
                          onChange={(e) => setDonationForm({ ...donationForm, address: e.target.value.toUpperCase() })}
                          placeholder="e.g. 123 STREET NAME, TOWN"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Purpose</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            required
                            value={donationForm.purpose}
                            onChange={(e) => {
                              setDonationForm({ ...donationForm, purpose: e.target.value.toUpperCase() });
                              setShowPurposeSuggestions(true);
                            }}
                            onFocus={() => setShowPurposeSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowPurposeSuggestions(false), 200)}
                            placeholder="e.g. FESTIVAL FUND"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                          />
                          {showPurposeSuggestions && matchingPurposes.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '4px', overflow: 'hidden' }}>
                              {matchingPurposes.map((purpose, idx) => (
                                <div
                                  key={idx}
                                  onMouseDown={() => {
                                    setDonationForm({ ...donationForm, purpose: purpose.toUpperCase() });
                                    setShowPurposeSuggestions(false);
                                  }}
                                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', fontWeight: '600', color: '#0f172a', transition: 'background 0.2s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  {purpose}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                          This purpose will be automatically pre-filled for your next donation entry.
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingDonation}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          marginTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {submittingDonation ? 'Saving...' : (
                          editingDonationId ? <><CheckCircle size={16} /> Update Donation</> : <><CheckCircle size={16} /> Save Donation</>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Custom Confirmation Modal */}
              {confirmConfig.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '20px' }}>
                  <div className="glass-panel p-6 animate-scale-up" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <div style={{ 
                        background: confirmConfig.type === 'danger' ? '#fee2e2' : 'rgba(79, 70, 229, 0.1)', 
                        color: confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5', 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        {confirmConfig.type === 'danger' ? <AlertCircle size={28} /> : <CheckCircle size={28} />}
                      </div>
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '950', color: '#0f172a' }}>{confirmConfig.title}</h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: '600', color: '#475569', lineHeight: '1.5' }}>{confirmConfig.message}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        type="button"
                        onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          borderRadius: '12px', 
                          border: '1px solid #cbd5e1', 
                          background: 'white', 
                          color: '#475569', 
                          fontWeight: '800', 
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        {confirmConfig.cancelText}
                      </button>
                      <button 
                        type="button"
                        onClick={confirmConfig.onConfirm}
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          borderRadius: '12px', 
                          border: 'none', 
                          background: confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5', 
                          color: 'white', 
                          fontWeight: '800', 
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = confirmConfig.type === 'danger' ? '#dc2626' : '#4338ca'}
                        onMouseLeave={(e) => e.currentTarget.style.background = confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5'}
                      >
                        {confirmConfig.confirmText}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Update Password */}
          {activeTab === 'password' && (
            <div className="glass-panel p-8 animate-fade-in" style={{ background: 'white', borderRadius: '24px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #cbd5e1' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '950', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="var(--primary-color)" /> Update Password
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                Change your login credentials to protect your cashier terminal access.
              </p>

              {pwdStatus.message && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: pwdStatus.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  background: pwdStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: pwdStatus.type === 'success' ? '#10b981' : '#ef4444'
                }}>
                  {pwdStatus.type === 'success' ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                  <span>{pwdStatus.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Current Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Enter current password..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Min 5 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Confirm new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={pwdLoading}
                  style={{ 
                    background: 'var(--primary-color)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    fontWeight: '800', 
                    cursor: pwdLoading ? 'not-allowed' : 'pointer', 
                    fontSize: '0.9rem', 
                    marginTop: '8px',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* PRINTABLE RECEIPT DIALOG MODAL VIA PORTAL */}
      {showReceiptModal && currentReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Control header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }} className="no-print">
              <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>Printable Receipt Invoice</h2>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Area (Target for print) */}
            <div id="printable-invoice-area" style={{ border: '2px solid #0f172a', padding: '24px', background: '#fff', borderRadius: '16px', fontFamily: 'monospace', lineHeight: '1.4', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: '900' }}>Denalai Village Authority</h3>
                <span style={{ fontSize: '0.8rem' }}>Treasury Collection Receipt Terminal</span>
                <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>Date: {new Date(currentReceipt.paymentDate).toLocaleString()}</div>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                <div><strong>Receipt No:</strong> #{currentReceipt.receiptNumber}</div>
                <div><strong>Processed By:</strong> {cashier?.name} (Cashier ID: #{cashier?.cashierId})</div>
                <div><strong>Villager Head:</strong> {currentReceipt.memberId?.name}</div>
                <div><strong>Family ID:</strong> #{currentReceipt.memberId?.familyId || 'N/A'}</div>
                <div><strong>Payment Mode:</strong> {currentReceipt.paymentMode?.toUpperCase()}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', fontWeight: '900' }}>
                    <th style={{ padding: '6px 0' }}>Dues Item Description</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReceipt.splitDetails?.map((split, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0' }}>{fundDisplayName(split.fundId) || 'General Due Invoice'}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{split.amountAllocated}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px dashed #000', fontWeight: '900' }}>
                    <td style={{ padding: '10px 0 0 0' }}>TOTAL AMOUNT PAID</td>
                    <td style={{ padding: '10px 0 0 0', textAlign: 'right', fontSize: '1.05rem' }}>₹{currentReceipt.totalAmountPaid}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
                <div style={{ textTransform: 'uppercase', fontWeight: '900', color: '#10b981', fontSize: '1rem', letterSpacing: '1px', marginBottom: '4px' }}>★ PAID IN FULL ★</div>
                Thank you for your timely contribution!
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '24px', justifyContent: 'flex-end' }} className="no-print">
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: '#f1f5f9', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Close View
              </button>
              <button 
                onClick={() => {
                  const printContents = document.getElementById('printable-invoice-area').innerHTML;
                  const originalContents = document.body.innerHTML;
                  
                  // Setup clean document for printing
                  document.body.innerHTML = printContents;
                  window.print();
                  
                  // Restore
                  window.location.reload();
                }}
                style={{ background: '#2563eb', border: 'none', color: 'white', padding: '12px 20px', borderRadius: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Printer size={16} /> Print Invoice
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BEAUTIFUL DETAILS DIALOG MODAL */}
      {showDetailsModal && selectedMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-fade-in details-modal-container" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '750px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {detailsModalType === 'allotted' && <span style={{ color: '#4f46e5' }}>📋 Total Allotted Dues</span>}
                  {detailsModalType === 'paid' && <span style={{ color: '#10b981' }}>✅ Total Paid Dues</span>}
                  {detailsModalType === 'outstanding' && <span style={{ color: '#e11d48' }}>⚠️ Outstanding Dues</span>}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                  Villager: <strong style={{ color: '#1e293b' }}>{selectedMember.name}</strong> • Family ID: #{selectedMember.familyId}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Summary Banner */}
            {(() => {
              const totalAllotted = allDues.reduce((s, d) => s + d.totalDueAmount, 0);
              const totalPaid = allDues.reduce((s, d) => s + d.amountPaid, 0);
              const totalOutstanding = totalAllotted - totalPaid;
              
              let title = '';
              let amt = 0;
              let bg = '';
              let fg = '';
              let border = '';
              
              if (detailsModalType === 'allotted') {
                title = 'Total Allotted Amount';
                amt = totalAllotted;
                bg = 'rgba(79,70,229,0.06)';
                fg = '#4f46e5';
                border = '1px solid rgba(79,70,229,0.15)';
              } else if (detailsModalType === 'paid') {
                title = 'Total Settled Amount';
                amt = totalPaid;
                bg = 'rgba(16,185,129,0.06)';
                fg = '#10b981';
                border = '1px solid rgba(16,185,129,0.15)';
              } else {
                title = 'Total Outstanding Dues';
                amt = totalOutstanding;
                bg = totalOutstanding > 0 ? 'rgba(225,29,72,0.06)' : 'rgba(16,185,129,0.06)';
                fg = totalOutstanding > 0 ? '#e11d48' : '#10b981';
                border = totalOutstanding > 0 ? '1px solid rgba(225,29,72,0.15)' : '1px solid rgba(16,185,129,0.15)';
              }

              return (
                <div style={{ background: bg, border: border, borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
                  <strong style={{ fontSize: '1.8rem', color: fg, fontWeight: '900' }}>₹{amt.toLocaleString()}</strong>
                </div>
              );
            })()}

            {/* Inline search filter inside modal */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 14px', marginBottom: '16px' }}>
              <Search size={16} color="#64748b" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search by fund name or type..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 0', width: '100%', fontSize: '0.85rem', fontWeight: '600' }}
              />
              {modalSearchTerm && (
                <button onClick={() => setModalSearchTerm('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dues Details Table/List Area */}
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '45vh', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              {(() => {
                let filteredDues = [];
                if (detailsModalType === 'allotted') {
                  filteredDues = allDues;
                } else if (detailsModalType === 'paid') {
                  filteredDues = allDues.filter(d => d.amountPaid > 0);
                } else if (detailsModalType === 'outstanding') {
                  filteredDues = allDues.filter(d => (d.totalDueAmount - d.amountPaid) > 0);
                }

                // Apply search filter
                if (modalSearchTerm.trim() !== '') {
                  filteredDues = filteredDues.filter(d => 
                    fundDisplayName(d.fundId).toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                    (d.fundId?.fundType && d.fundId.fundType.toLowerCase().includes(modalSearchTerm.toLowerCase()))
                  );
                }

                if (filteredDues.length === 0) {
                  return (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                      No dues found matching this category.
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '12px 16px' }}>Fund Name</th>
                        <th style={{ padding: '12px 16px' }}>Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allotted</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: '#334155', fontWeight: '600' }}>
                      {filteredDues.map((due) => {
                        const maxRem = due.totalDueAmount - due.amountPaid;
                        let statusColor = '#ef4444';
                        let statusBg = 'rgba(239, 68, 68, 0.08)';
                        let statusText = 'Unpaid';
                        
                        if (due.status === 'paid' || maxRem <= 0) {
                          statusColor = '#10b981';
                          statusBg = 'rgba(16, 185, 129, 0.08)';
                          statusText = 'Paid';
                        } else if (due.amountPaid > 0) {
                          statusColor = '#f59e0b';
                          statusBg = 'rgba(245, 158, 11, 0.08)';
                          statusText = 'Partial';
                        }

                        return (
                          <tr key={due._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{fundDisplayName(due.fundId)}</strong>
                              {due.fundId?.dueDate && (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                  Due: {new Date(due.fundId.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                {due.fundId?.fundType || 'General'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>₹{due.totalDueAmount.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>₹{due.amountPaid.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: maxRem > 0 ? '#e11d48' : '#10b981', fontWeight: '700' }}>₹{maxRem.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '20px' }}>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#4338ca'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Payment Confirmation Modal Overlay */}
      {paymentToConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-fade-in" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={28} color="#f59e0b" />
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '1.2rem' }}>Confirm Payment</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Please review before processing</span>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Total Amount</span>
                <strong style={{ fontSize: '2.5rem', color: '#4f46e5', fontWeight: '900', lineHeight: 1 }}>₹{paymentToConfirm.total.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Villager:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedMember?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Funds Count:</span>
                  <strong style={{ color: '#0f172a' }}>{paymentToConfirm.payload.splitDetails.length} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Mode:</span>
                  <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{paymentMode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date:</span>
                  <strong style={{ color: '#0f172a' }}>{paymentDate ? new Date(paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}</strong>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', background: '#f8fafc' }}>
              <button 
                onClick={() => setPaymentToConfirm(null)}
                disabled={processingPayment}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '800', cursor: processingPayment ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmedPayment}
                disabled={processingPayment}
                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', fontWeight: '800', cursor: processingPayment ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
              >
                {processingPayment ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {processingPayment ? 'Processing...' : 'Confirm Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Photo Payment Upload & Approval Modal */}
      {showPhotoModal && (
        <div className="modal-backdrop animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content animate-scale-up" style={{ width: '100%', maxWidth: '960px', maxHeight: '90vh', background: 'white', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={24} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>Record Payment via Photo Upload</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Upload receipt, review auto-extracted details, & approve member dues</span>
                </div>
              </div>
              <button 
                onClick={() => setShowPhotoModal(false)}
                style={{ background: '#e2e8f0', border: 'none', color: '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {photoError && (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.88rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span>{photoError}</span>
                </div>
              )}

              {!photoFile ? (
                /* Upload Dropzone View */
                <div style={{ border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '40px 20px', textAlign: 'center', background: '#f8fafc', transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => document.getElementById('photo-input-file').click()}>
                  <input 
                    id="photo-input-file"
                    type="file" 
                    accept="image/*,application/pdf,.pdf"
                    onChange={handlePhotoFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <Upload size={32} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '800' }}>Drop payment receipt photo or PDF document here</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Supports UPI screenshots, bank slips, cash receipts, and PDF documents</p>
                </div>
              ) : (
                /* Interactive Pagewise Approval & Allocation View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Pagewise Navigation Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '10px 16px', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                        📄 Page Review ({currentPageIndex + 1} of {photoPages.length || 1}):
                      </span>
                      
                      {(photoPages.length > 0 ? photoPages : [{ pageNum: 1 }]).map((pg, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleSwitchPage(idx)}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '8px',
                            border: idx === currentPageIndex ? '2px solid #6366f1' : '1px solid #cbd5e1',
                            background: idx === currentPageIndex ? '#6366f1' : (pg.isApproved ? '#dcfce7' : 'white'),
                            color: idx === currentPageIndex ? 'white' : (pg.isApproved ? '#166534' : '#475569'),
                            fontWeight: '800',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {pg.isApproved ? '✅' : '📄'} Page {idx + 1} {pg.isApproved ? '(Approved)' : ''}
                        </button>
                      ))}

                      <button 
                        onClick={handleAddPage}
                        style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        + Add Page
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        disabled={currentPageIndex === 0}
                        onClick={() => handleSwitchPage(currentPageIndex - 1)}
                        style={{ background: 'white', border: '1px solid #cbd5e1', color: currentPageIndex === 0 ? '#94a3b8' : '#334155', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer' }}
                      >
                        ← Prev Page
                      </button>

                      <button 
                        disabled={currentPageIndex >= photoPages.length - 1}
                        onClick={() => handleSwitchPage(currentPageIndex + 1)}
                        style={{ background: 'white', border: '1px solid #cbd5e1', color: currentPageIndex >= photoPages.length - 1 ? '#94a3b8' : '#334155', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', cursor: currentPageIndex >= photoPages.length - 1 ? 'not-allowed' : 'pointer' }}
                      >
                        Next Page →
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
                  
                  {/* Left Column: Photo / PDF Preview & Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden', background: '#0f172a', position: 'relative' }}>
                      {photoMetadata?.isPdf ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <FileText size={48} color="#38bdf8" />
                          <strong style={{ fontSize: '0.95rem' }}>{photoMetadata.fileName}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PDF Receipt Document ({photoMetadata.fileSize})</span>
                          <a 
                            href={photoMetadata.imageUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: '800', textDecoration: 'underline', marginTop: '4px' }}
                          >
                            📄 Open Full PDF Document ↗
                          </a>
                        </div>
                      ) : (
                        photoMetadata?.imageUrl && (
                          <img 
                            src={photoMetadata.imageUrl} 
                            alt="Payment Receipt" 
                            style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block' }} 
                          />
                        )
                      )}
                      <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {photoMetadata?.fileName} ({photoMetadata?.fileSize})
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={16} color="#6366f1" /> Captured Receipt Details
                      </h4>

                      {/* Captured ID & Month Metadata Banner with RED Highlighting */}
                      <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)', border: '1px solid #fca5a5', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: '800', textTransform: 'uppercase' }}>Detected Receipt ID / Ref:</span>
                          <span style={{ background: '#dc2626', color: 'white', padding: '3px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                            🔴 ID: {photoMetadata?.extractedId || photoMetadata?.referenceNo || 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span style={{ color: '#991b1b', fontWeight: '700' }}>Detected Period / Month:</span>
                          <strong style={{ color: '#991b1b', fontWeight: '800' }}>
                            {photoMetadata?.extractedMonth || 'Yearly / Monthly'} {photoMetadata?.extractedYear || ''}
                          </strong>
                        </div>

                        {/* Check if captured ID matches any registered villager */}
                        {(() => {
                          const extId = photoMetadata?.extractedId;
                          if (!extId) return null;
                          const matchedMem = allMembers.find(m => 
                            String(m.memberId) === String(extId) || 
                            String(m.familyId) === String(extId)
                          );
                          if (!matchedMem) return null;
                          const isAlreadyAdded = photoMembers.some(pm => pm.member._id === matchedMem._id);

                          return (
                            <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: '800' }}>
                                🎯 Red ID Match: <strong>{matchedMem.name}</strong> (Fam ID: {matchedMem.familyId})
                              </span>
                              {!isAlreadyAdded ? (
                                <button 
                                  onClick={() => handleAddMemberToPhoto(matchedMem)}
                                  style={{ background: '#dc2626', color: 'white', border: 'none', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)' }}
                                >
                                  + Auto-Add Member
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '800' }}>✅ Added</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Total Amount (₹)</label>
                          <input 
                            type="number"
                            value={photoTotalAmount}
                            onChange={(e) => setPhotoTotalAmount(e.target.value)}
                            placeholder="e.g. 2400"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: '900', color: '#4f46e5', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Payment Mode</label>
                          <select 
                            value={photoPaymentMode}
                            onChange={(e) => setPhotoPaymentMode(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                          >
                            <option value="upi">UPI / GPay / PhonePe</option>
                            <option value="cash">Cash Counter</option>
                            <option value="online">Bank Transfer / NEFT</option>
                            <option value="card">Card / POS</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                          <input 
                            type="date"
                            value={photoPaymentDate}
                            onChange={(e) => setPhotoPaymentDate(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Ref / UTR Number</label>
                          <input 
                            type="text"
                            value={photoNotes}
                            onChange={(e) => setPhotoNotes(e.target.value)}
                            placeholder="e.g. UTR 123456"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700', color: '#334155', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => { setPhotoFile(null); setPhotoMetadata(null); }}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      >
                        🔄 Replace Photo / PDF
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Member Selection & Multi-Fund Allocation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={16} color="#6366f1" /> Allocate Payment to Villager Member(s)
                    </h4>

                    {/* Member Search Bar for Photo Payment */}
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text"
                        placeholder="Type name or Family ID to add member to photo receipt..."
                        value={photoSearchTerm}
                        onChange={(e) => setPhotoSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem', fontWeight: '600', boxSizing: 'border-box' }}
                      />
                      {photoSearchTerm.trim() !== '' && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '4px', overflow: 'hidden' }}>
                          {allMembers.filter(m => 
                            m.name.toLowerCase().includes(photoSearchTerm.toLowerCase()) || 
                            (m.familyId && m.familyId.toString().includes(photoSearchTerm)) ||
                            (m.memberId && m.memberId.toString().includes(photoSearchTerm))
                          ).slice(0, 5).map(m => (
                            <div 
                              key={m._id}
                              onClick={() => handleAddMemberToPhoto(m)}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <div>
                                <strong style={{ color: '#0f172a', display: 'block' }}>{m.name}</strong>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '900' }}>
                                    🔴 Family ID: {m.familyId}
                                  </span>
                                  <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '900' }}>
                                    🔴 Member ID: {m.memberId}
                                  </span>
                                </div>
                              </div>
                              <span style={{ background: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>+ Add</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Members Allocation Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '340px', overflowY: 'auto' }}>
                      {photoMembers.length === 0 ? (
                        <div style={{ padding: '30px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
                          No members added to this photo payment yet. Search and select a member above.
                        </div>
                      ) : (
                        photoMembers.map((pm, idx) => (
                          <div key={pm.member._id} style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{pm.member.name}</strong>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                  <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '900' }}>
                                    🔴 Family ID: {pm.member.familyId}
                                  </span>
                                  <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '900' }}>
                                    🔴 Member ID: {pm.member.memberId}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveMemberFromPhoto(pm.member._id)}
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                              >
                                Remove
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>Member Share Amount (₹)</span>
                              <input 
                                type="number"
                                value={pm.amountAllocated}
                                onChange={(e) => handleMemberPhotoAmountChange(pm.member._id, e.target.value)}
                                style={{ width: '110px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', textAlign: 'right', outline: 'none' }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b' }}>Pending Funds Breakdown:</span>
                              <button 
                                onClick={() => autoAllocateMemberEntry(pm, pm.amountAllocated, pm.unpaidDues)}
                                style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Zap size={12} /> Auto-Allocate Dues
                              </button>
                            </div>

                            {pm.unpaidDues.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', fontStyle: 'italic' }}>
                                ✅ Member has no pending dues!
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pm.unpaidDues.map(due => {
                                  const maxRem = due.totalDueAmount - due.amountPaid;
                                  const isChecked = !!pm.selectedFunds[due._id];
                                  const allocVal = pm.splits[due._id] !== undefined ? pm.splits[due._id] : '';
                                  const fundObj = due.fundId || {};
                                  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                  const mName = fundObj.month ? MONTHS[fundObj.month - 1] : '';
                                  const yStr = fundObj.year || '';
                                  const dueIdShort = fundObj._id ? fundObj._id.slice(-6).toUpperCase() : due._id.slice(-6).toUpperCase();

                                  return (
                                    <div key={due._id} style={{ background: 'white', padding: '8px 10px', borderRadius: '8px', border: isChecked ? '1px solid #818cf8' : '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                          <input 
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleTogglePhotoMemberFund(pm.member._id, due._id)}
                                          />
                                          <div>
                                            <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block' }}>{fundDisplayName(due.fundId)}</strong>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                                              <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '900' }}>
                                                🔴 Fund ID: {dueIdShort}
                                              </span>
                                              {(mName || yStr) && (
                                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                                                  📅 Period: {[mName, yStr].filter(Boolean).join(' ')}
                                                </span>
                                              )}
                                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>
                                                Target: ₹{due.totalDueAmount}
                                              </span>
                                            </div>
                                          </div>
                                        </label>
                                      </div>

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #f1f5f9', paddingTop: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '800' }}>
                                          Outstanding: ₹{maxRem}
                                        </span>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <button
                                            onClick={() => {
                                              if (!isChecked) handleTogglePhotoMemberFund(pm.member._id, due._id);
                                              handlePhotoMemberFundSplitChange(pm.member._id, due._id, maxRem, maxRem);
                                            }}
                                            style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                                          >
                                            ⚡ Fill ₹{maxRem}
                                          </button>
                                          <input 
                                            type="number"
                                            value={allocVal}
                                            onChange={(e) => handlePhotoMemberFundSplitChange(pm.member._id, due._id, e.target.value, maxRem)}
                                            disabled={!isChecked}
                                            placeholder="0"
                                            style={{ width: '70px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            </div>

            {/* Modal Footer */}
            {photoFile && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
                  Allocated (Page {currentPageIndex + 1}): <strong style={{ color: '#4f46e5' }}>₹{photoMembers.reduce((sum, pm) => sum + (parseFloat(pm.amountAllocated) || 0), 0).toLocaleString()}</strong> / Total: <strong style={{ color: '#0f172a' }}>₹{parseFloat(photoTotalAmount || 0).toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setShowPhotoModal(false)}
                    disabled={processingPhotoBatch}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '800', cursor: processingPhotoBatch ? 'not-allowed' : 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (currentPageIndex < photoPages.length - 1) {
                        setPhotoPages(prev => prev.map((p, idx) => idx === currentPageIndex ? { ...p, isApproved: true } : p));
                        handleSwitchPage(currentPageIndex + 1);
                      } else {
                        handleApprovePhotoBatchPayment();
                      }
                    }}
                    disabled={processingPhotoBatch}
                    style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: '800', cursor: processingPhotoBatch ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)' }}
                  >
                    {processingPhotoBatch ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {processingPhotoBatch 
                      ? 'Recording Payments...' 
                      : (currentPageIndex < photoPages.length - 1 
                          ? `Approve Page ${currentPageIndex + 1} & Go to Page ${currentPageIndex + 2} ➔` 
                          : 'Approve & Record All Pages'
                        )
                    }
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Batch Success Receipts Confirmation Modal */}
      {showBatchSuccessModal && batchReceiptsResult && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-fade-in" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: '900' }}>Photo Payments Recorded Successfully!</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9, fontWeight: '600' }}>
                Receipts generated and member fund ledgers reconciled.
              </p>
            </div>

            <div style={{ padding: '24px', maxHeight: '300px', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800' }}>Generated Member Receipts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {batchReceiptsResult.map((rcpt, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.92rem' }}>{rcpt.memberId?.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Receipt No: <code style={{ color: '#4f46e5', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px' }}>{rcpt.receiptNumber}</code></span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#10b981', fontSize: '1.05rem', display: 'block' }}>₹{rcpt.totalAmountPaid.toLocaleString()}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{rcpt.splitDetails?.length} funds paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowBatchSuccessModal(false); setBatchReceiptsResult(null); }}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)' }}
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierDashboard;
