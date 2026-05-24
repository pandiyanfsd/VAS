import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, X, Users, FileSpreadsheet, FileText, User, Baby } from 'lucide-react';
import './ManageMembers.css';

const ManageMembers = () => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('households'); // 'households' or 'individuals'
  const [genderFilter, setGenderFilter] = useState('all'); // 'all', 'male', 'female', 'other'
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedIndividualId, setSelectedIndividualId] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [subMemberToDelete, setSubMemberToDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Financial Dues & Funds States
  const [dues, setDues] = useState([]);
  const [funds, setFunds] = useState([]);
  const [assignSpecificFunds, setAssignSpecificFunds] = useState(false);
  const [selectedFunds, setSelectedFunds] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    memberId: '',
    familyId: '',
    name: '',
    phone: '',
    password: '',
    gender: 'male',
    age: '',
    subFamilyMembers: []
  });

  const inferGender = (relation = '') => {
    const maleRels = ['Son', 'Father', 'Brother', 'Grandfather', 'Grandson', 'Uncle', 'Nephew', 'Father-in-law', 'Brother-in-law', 'Son-in-law'];
    const femaleRels = ['Daughter', 'Mother', 'Sister', 'Grandmother', 'Granddaughter', 'Aunt', 'Niece', 'Mother-in-law', 'Sister-in-law', 'Daughter-in-law'];
    if (maleRels.includes(relation)) return 'male';
    if (femaleRels.includes(relation)) return 'female';
    return 'other';
  };

  const getNextAvailableMemberId = (additionalUsedIds = []) => {
    const usedIds = new Set(additionalUsedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)));
    members.forEach(m => {
      let id = parseInt(m.memberId, 10);
      if (!isNaN(id)) usedIds.add(id);
      m.subFamilyMembers?.forEach(sub => {
        let subId = parseInt(sub.memberId, 10);
        if (!isNaN(subId)) usedIds.add(subId);
      });
    });
    let nextId = 1;
    while (usedIds.has(nextId)) {
      nextId++;
    }
    return nextId;
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditId(null);
    const famIds = new Set(members.map(m => parseInt(m.familyId, 10)).filter(id => !isNaN(id)));
    let nextFamId = 1;
    while (famIds.has(nextFamId)) {
      nextFamId++;
    }
    
    let nextMemId = getNextAvailableMemberId();

    setFormData({
      familyId: nextFamId.toString(),
      memberId: nextMemId.toString(),
      name: '',
      phone: '',
      password: 'password123',
      gender: 'male',
      age: '',
      subFamilyMembers: []
    });
    setAssignSpecificFunds(false);
    setSelectedFunds(funds.map(f => f._id));
    setIsModalOpen(true);
  };

  const handleEdit = (member) => {
    setIsEditMode(true);
    setEditId(member._id);
    setFormData({
      familyId: member.familyId,
      memberId: member.memberId,
      name: member.name,
      phone: member.phone,
      password: '',
      gender: member.gender || 'male',
      age: member.age || '',
      subFamilyMembers: member.subFamilyMembers || []
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [memRes, duesRes, fundsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds`)
      ]);
      setMembers(memRes.data);
      setDues(duesRes.data);
      setFunds(fundsRes.data);
    } catch (error) {
      console.error("Error fetching members/dues/funds", error);
    } finally {
      setLoading(false);
    }
  };

  const getFamilyFinancials = (memberId) => {
    const familyDues = dues.filter(d => (d.memberId?._id || d.memberId) === memberId);
    const totalDue = familyDues.reduce((acc, curr) => acc + (curr.totalDueAmount || 0), 0);
    const totalPaid = familyDues.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
    const totalUnpaid = Math.max(0, totalDue - totalPaid);
    return { totalDue, totalPaid, totalUnpaid, familyDues };
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = value.toUpperCase();
    setFormData({ ...formData, [name]: value });
  };

  const handleAddSubMember = () => {
    const currentFormIds = [formData.memberId, ...formData.subFamilyMembers.map(sub => sub.memberId)];
    const nextSubMemId = getNextAvailableMemberId(currentFormIds);

    setFormData({
      ...formData,
      subFamilyMembers: [...formData.subFamilyMembers, { memberId: nextSubMemId.toString(), name: '', relation: '', age: '', gender: 'male' }]
    });
  };

  const handleSubMemberChange = (index, field, value) => {
    const updatedSubMembers = [...formData.subFamilyMembers];
    if (field === 'name') value = value.toUpperCase();
    updatedSubMembers[index][field] = value;
    if (field === 'relation' && !updatedSubMembers[index].gender) {
      updatedSubMembers[index].gender = inferGender(value);
    }
    setFormData({ ...formData, subFamilyMembers: updatedSubMembers });
  };

  const handleRemoveSubMember = (index) => {
    const updatedSubMembers = formData.subFamilyMembers.filter((_, i) => i !== index);
    setFormData({ ...formData, subFamilyMembers: updatedSubMembers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Explicit relation validation
    const missingRelation = formData.subFamilyMembers.some(sub => !sub.relation);
    if (missingRelation) {
      setErrorMsg("Please select a relation for all sub-family members before submitting.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      if (!isEditMode && assignSpecificFunds) {
        payload.selectedFunds = selectedFunds;
      }

      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${editId}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`, payload);
      }
      setIsModalOpen(false);
      fetchMembers();
      // Reset form
      setFormData({ memberId: '', familyId: '', name: '', phone: '', password: '', gender: 'male', age: '', subFamilyMembers: [] });
    } catch (error) {
      setErrorMsg(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} member.`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${memberToDelete._id}`);
      fetchMembers();
      setMemberToDelete(null);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Failed to delete family.");
    } finally {
      setLoading(false);
    }
  };

  const confirmSubMemberDelete = async () => {
    if (!subMemberToDelete) return;
    setLoading(true);
    try {
      const { familyRecord, subMember } = subMemberToDelete;
      const updatedSubMembers = familyRecord.subFamilyMembers.filter(s => s.memberId !== subMember.memberId);
      
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${familyRecord._id}`, {
        ...familyRecord,
        subFamilyMembers: updatedSubMembers
      });
      
      setSelectedMember(res.data);
      fetchMembers();
      setSubMemberToDelete(null);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Failed to remove sub-member.");
    } finally {
      setLoading(false);
    }
  };

  // Flatten all individual villagers
  const allIndividualVillagers = [];
  members.forEach(m => {
    allIndividualVillagers.push({
      id: m._id + '_head',
      familyId: m.familyId,
      memberId: m.memberId,
      name: m.name,
      phone: m.phone,
      isHead: true,
      age: m.age !== undefined && m.age !== null ? m.age : null,
      gender: m.gender || 'male',
      subCount: (m.subFamilyMembers || []).length
    });
    m.subFamilyMembers?.forEach(sub => {
      allIndividualVillagers.push({
        id: m._id + '_' + sub.memberId,
        familyId: m.familyId,
        memberId: sub.memberId,
        name: sub.name,
        relation: sub.relation,
        age: sub.age !== undefined && sub.age !== null ? sub.age : null,
        gender: sub.gender || inferGender(sub.relation),
        isHead: false
      });
    });
  });

  const filteredMembers = members
    .filter(m => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || m.name.toLowerCase().includes(term) || (m.familyId && m.familyId.toString().toLowerCase().includes(term)) || (m.subFamilyMembers || []).some(sub => sub.name.toLowerCase().includes(term) || (sub.memberId && sub.memberId.toString().toLowerCase().includes(term)));
      if (!matchesSearch) return false;
      
      if (genderFilter !== 'all') {
        const hasMatchingGender = (m.gender || 'male') === genderFilter || (m.subFamilyMembers || []).some(sub => (sub.gender || inferGender(sub.relation)) === genderFilter);
        if (!hasMatchingGender) return false;
      }
      if (minAgeFilter || maxAgeFilter) {
        const mAge = m.age !== undefined && m.age !== null && m.age !== '' ? parseInt(m.age, 10) : -1;
        const headMatches = (!minAgeFilter || (mAge >= 0 && mAge >= parseInt(minAgeFilter, 10))) && (!maxAgeFilter || (mAge >= 0 && mAge <= parseInt(maxAgeFilter, 10)));
        const subMatches = (m.subFamilyMembers || []).some(sub => {
          const sAge = sub.age !== undefined && sub.age !== null && sub.age !== '' ? parseInt(sub.age, 10) : -1;
          return sAge >= 0 && (!minAgeFilter || sAge >= parseInt(minAgeFilter, 10)) && (!maxAgeFilter || sAge <= parseInt(maxAgeFilter, 10));
        });
        if (!headMatches && !subMatches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const idA = parseInt(a.familyId, 10);
      const idB = parseInt(b.familyId, 10);
      if (!isNaN(idA) && !isNaN(idB)) {
        return idA - idB;
      }
      return (a.familyId || '').localeCompare(b.familyId || '');
    });

  const filteredIndividuals = allIndividualVillagers.filter(v => {
    const matchesSearch = !searchTerm || (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (v.familyId && String(v.familyId).toLowerCase().includes(searchTerm.toLowerCase())) || (v.memberId && String(v.memberId).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGender = genderFilter === 'all' || v.gender === genderFilter;
    const vAge = v.age !== null && v.age !== undefined && v.age !== '' ? parseInt(v.age, 10) : -1;
    const matchesMinAge = !minAgeFilter || (vAge >= 0 && vAge >= parseInt(minAgeFilter, 10));
    const matchesMaxAge = !maxAgeFilter || (vAge >= 0 && vAge <= parseInt(maxAgeFilter, 10));
    return matchesSearch && matchesGender && matchesMinAge && matchesMaxAge;
  });

  const getFilterSummaryText = () => {
    let parts = [];
    if (genderFilter !== 'all') parts.push(`Gender: ${genderFilter.toUpperCase()}`);
    if (minAgeFilter || maxAgeFilter) parts.push(`Age: ${minAgeFilter || '0'} to ${maxAgeFilter || '120'} yrs`);
    if (searchTerm) parts.push(`Search: "${searchTerm}"`);
    return parts.length > 0 ? parts.join(' • ') : 'All Registered / No Active Filters';
  };

  const exportToCSV = () => {
    if (viewMode === 'individuals') {
      const headers = ["Family ID", "Member ID", "Full Villager Name", "Role / Relationship", "Gender", "Age (yrs)"];
      const rows = filteredIndividuals.map(v => [
        `"${v.familyId || ''}"`,
        `"${v.memberId || 'N/A'}"`,
        `"${(v.name || '').replace(/"/g, '""')}"`,
        `"${v.isHead ? 'Household Head' : v.relation}"`,
        `"${v.gender}"`,
        v.age !== null ? v.age : 'Unrecorded'
      ].join(","));
      
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Denalai_Villagers_Demographic_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ["Family ID", "Member ID (Head)", "Household Head Name", "Phone", "Total Dependents", "Dependents Details (Name - Relation - Age)"];
      const rows = filteredMembers.map(m => {
        const dependentsStr = (m.subFamilyMembers || []).map(sub => `${sub.name} (${sub.relation}${sub.age ? `, ${sub.age}y` : ''})`).join("; ");
        return [
          `"${m.familyId || ''}"`,
          `"${m.memberId || ''}"`,
          `"${(m.name || '').replace(/"/g, '""')}"`,
          `"${m.phone || ''}"`,
          (m.subFamilyMembers || []).length,
          `"${dependentsStr.replace(/"/g, '""')}"`
        ].join(",");
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Denalai_Households_Directory_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups in your browser to generate the PDF report.");
      return;
    }
    
    const filterText = getFilterSummaryText();
    
    let tableHTML = '';
    let reportSubtitle = '';
    
    if (viewMode === 'individuals') {
      reportSubtitle = `Individual Villagers Demographic Report • Active Filter: ${filterText}`;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Fam ID</th>
              <th style="width: 15%;">Mem ID</th>
              <th style="width: 33%;">Villager Full Name</th>
              <th style="width: 20%;">Role / Relation</th>
              <th style="width: 10%;">Gender</th>
              <th style="width: 10%;">Age</th>
            </tr>
          </thead>
          <tbody>
            ${filteredIndividuals.map(v => `
              <tr>
                <td><strong style="color: #0f172a;">#${v.familyId}</strong></td>
                <td><span style="color: #64748b;">${v.memberId || 'N/A'}</span></td>
                <td><strong style="font-size: 14px; color: #0f172a;">${v.name}</strong></td>
                <td><span class="badge" style="background: ${v.isHead ? '#e0e7ff' : '#f1f5f9'}; color: ${v.isHead ? '#4338ca' : '#334155'}; font-size: 11px;">${v.isHead ? '👑 Household Head' : v.relation}</span></td>
                <td><span style="text-transform: capitalize; font-weight: 600; color: ${v.gender === 'female' ? '#e11d48' : '#4f46e5'};">${v.gender}</span></td>
                <td>${v.age !== null ? `${v.age}y` : '<span style="color:#94a3b8;">-</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          End of Demographic Report • Total Matching Villagers: ${filteredIndividuals.length} • Denalai Administration
        </div>
      `;
    } else {
      reportSubtitle = `Household Directory & Records • Active Filter: ${filterText}`;
      tableHTML = `
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Family ID</th>
              <th style="width: 28%;">Household Head (Mem ID)</th>
              <th style="width: 20%;">Contact Number</th>
              <th style="width: 40%;">Dependents & Relationship</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMembers.map(m => `
              <tr>
                <td><strong style="font-size: 15px; color: #0f172a;">#${m.familyId || 'N/A'}</strong></td>
                <td><strong style="font-size: 14px; color: #0f172a;">${m.name}</strong><br><span style="color:#64748b; font-size:11px; font-weight:600; margin-top:4px; display:inline-block;">ID: ${m.memberId || 'N/A'}</span></td>
                <td><span style="font-family: monospace; font-size: 13px; font-weight: 600; color: #1e293b;">${m.phone || 'N/A'}</span></td>
                <td>
                  ${(m.subFamilyMembers || []).length > 0 ? 
                    m.subFamilyMembers.map(sub => `
                      <div class="sub-member"><strong>${sub.name}</strong> <span class="badge">${sub.relation}</span> ${sub.age ? `• ${sub.age} yrs` : ''}</div>
                    `).join('')
                    : '<span style="color:#94a3b8; font-style:italic;">No dependents listed</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          End of Official Directory • Total Matching Households: ${filteredMembers.length} • Denalai Administration
        </div>
      `;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Denalai Village Report - ${viewMode === 'individuals' ? 'Villagers' : 'Households'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            margin: 40px;
            line-height: 1.5;
            background: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .header h1 {
            font-size: 26px;
            margin: 0;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 800;
          }
          .header p {
            color: #475569;
            margin: 8px 0 0 0;
            font-size: 14px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            font-size: 13px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 14px 16px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.8px;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .badge {
            display: inline-block;
            background: #e2e8f0;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            color: #334155;
            margin-left: 4px;
          }
          .sub-member {
            font-size: 12px;
            color: #475569;
            margin: 4px 0;
            padding-left: 8px;
            border-left: 2px solid #cbd5e1;
          }
          @media print {
            body { margin: 0; }
            @page { size: A4; margin: 20mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Denalai Village Administration</h1>
          <p>${reportSubtitle}</p>
        </div>
        ${tableHTML}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="manage-members-container animate-fade-in">
      <div className="header-actions">
        <div className="search-box glass-panel">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Name or Family ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons-container" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-primary add-btn" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
            <Plus size={18} /> Add New Member
          </button>
          <div className="mobile-actions-slider" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              onClick={exportToCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.8)', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: '700', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
              title="Download member details as CSV spreadsheet"
            >
              <FileSpreadsheet size={18} style={{ color: '#10b981' }} /> Export to CSV
            </button>
            <button 
              className="btn-secondary" 
              onClick={exportToPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.8)', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: '700', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
              title="Generate printable PDF directory"
            >
              <FileText size={18} style={{ color: '#ef4444' }} /> Export to PDF
            </button>
          </div>
        </div>
      </div>

      {/* Demographic Stats Banner */}
      {(() => {
        const childrenList = allIndividualVillagers.filter(v => v.age !== null && v.age < 18);
        const childrenCount = childrenList.length;
        const boyChildrenCount = childrenList.filter(v => v.gender === 'male').length;
        const girlChildrenCount = childrenList.filter(v => v.gender === 'female').length;
        const adultMaleCount = allIndividualVillagers.filter(v => v.gender === 'male' && !(v.age !== null && v.age < 18)).length;
        const adultFemaleCount = allIndividualVillagers.filter(v => v.gender === 'female' && !(v.age !== null && v.age < 18)).length;
        const seniorsList = allIndividualVillagers.filter(v => v.age !== null && v.age >= 60);
        const seniorsCount = seniorsList.length;
        const seniorMenCount = seniorsList.filter(v => v.gender === 'male').length;
        const seniorWomenCount = seniorsList.filter(v => v.gender === 'female').length;

        return (
          <div className="demographic-banner glass-panel mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div className="demo-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="demo-icon"><Users size={20} color="#38bdf8" /></span>
              <span className="demo-label" style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Total Villagers</span>
              <strong className="demo-value" style={{ fontSize: '2rem', color: '#38bdf8', fontWeight: '800' }}>{allIndividualVillagers.length}</strong>
              <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>Across {members.length} Households</span>
            </div>
            <div className="demo-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="demo-icon"><User size={20} color="#818cf8" /></span>
              <span className="demo-label" style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Adult Males</span>
              <strong className="demo-value" style={{ fontSize: '2rem', color: '#818cf8', fontWeight: '800' }}>{adultMaleCount}</strong>
              <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>{Math.round((adultMaleCount / (allIndividualVillagers.length || 1)) * 100)}% of population</span>
            </div>
            <div className="demo-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="6" r="4" />
                  <path d="M12 10l-6 11h12l-6-11z" />
                </svg>
              </span>
              <span className="demo-label" style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Adult Females</span>
              <strong className="demo-value" style={{ fontSize: '2rem', color: '#f43f5e', fontWeight: '800' }}>{adultFemaleCount}</strong>
              <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>{Math.round((adultFemaleCount / (allIndividualVillagers.length || 1)) * 100)}% of population</span>
            </div>
            <div className="demo-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="demo-icon"><Baby size={20} color="#34d399" /></span>
              <span className="demo-label" style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Children (&lt;18)</span>
              <strong className="demo-value" style={{ fontSize: '2rem', color: '#34d399', fontWeight: '800' }}>{childrenCount}</strong>
              <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                <span style={{ color: '#38bdf8', fontWeight: '800' }}>{boyChildrenCount} B</span>, <span style={{ color: '#f43f5e', fontWeight: '800' }}>{girlChildrenCount} G</span>
              </span>
            </div>
            <div className="demo-card" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span className="demo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="12" r="4" />
                  <circle cx="18" cy="12" r="4" />
                  <path d="M10 12a2 2 0 0 0 4 0" />
                  <path d="M2 12l2-4" />
                  <path d="M22 12l-2-4" />
                </svg>
              </span>
              <span className="demo-label" style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Seniors (60+)</span>
              <strong className="demo-value" style={{ fontSize: '2rem', color: '#fbbf24', fontWeight: '800' }}>{seniorsCount}</strong>
              <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                <span style={{ color: '#38bdf8', fontWeight: '800' }}>{seniorMenCount} M</span>, <span style={{ color: '#f43f5e', fontWeight: '800' }}>{seniorWomenCount} W</span>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Filter Controls Bar */}
      <div className="filter-controls glass-panel mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>View Mode:</span>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #cbd5e1' }}>
              <button 
                onClick={() => { setViewMode('households'); setGenderFilter('all'); setMinAgeFilter(''); setMaxAgeFilter(''); }}
                style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', background: viewMode === 'households' ? '#0f172a' : 'transparent', color: viewMode === 'households' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
              >
                🏠 Households
              </button>
              <button 
                onClick={() => setViewMode('individuals')}
                style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', background: viewMode === 'individuals' ? '#0f172a' : 'transparent', color: viewMode === 'individuals' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}
              >
                👤 Individual Villagers
              </button>
            </div>
          </div>

          {viewMode === 'individuals' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gender:</span>
                <select 
                  value={genderFilter} 
                  onChange={(e) => setGenderFilter(e.target.value)}
                  style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: '700', fontSize: '0.85rem', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Age Between:</span>
                <input 
                  type="number" 
                  placeholder="Min Age" 
                  value={minAgeFilter} 
                  onChange={(e) => setMinAgeFilter(e.target.value)}
                  style={{ width: '85px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', textAlign: 'center', outline: 'none' }}
                />
                <span style={{ color: '#64748b', fontWeight: '800', fontSize: '0.85rem' }}>to</span>
                <input 
                  type="number" 
                  placeholder="Max Age" 
                  value={maxAgeFilter} 
                  onChange={(e) => setMaxAgeFilter(e.target.value)}
                  style={{ width: '85px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', textAlign: 'center', outline: 'none' }}
                />
              </div>
            </>
          )}
        </div>
        
        {viewMode === 'individuals' && (genderFilter !== 'all' || minAgeFilter || maxAgeFilter || searchTerm) && (
          <button 
            onClick={() => { setGenderFilter('all'); setMinAgeFilter(''); setMaxAgeFilter(''); setSearchTerm(''); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(239,68,68,0.2)', whiteSpace: 'nowrap' }}
          >
            Clear Filters
          </button>
        )}
      </div>
      <div className="members-grid">
        {viewMode === 'households' ? (
          filteredMembers.map(member => (
            <div key={member._id} className="member-card glass-panel hover-scale" onClick={() => setSelectedMember(member)} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <span className="badge">{member.familyId}</span>
                <div className="actions-cell">
                  <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(member); }}><Edit2 size={16} /></button>
                  <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setMemberToDelete(member); }}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="card-body">
                <h3>{member.name}</h3>
                <p><strong>Phone:</strong> {member.phone}</p>
                <p><strong>Member ID (Head):</strong> {member.memberId || 'N/A'}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                  <span><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{member.gender || 'male'}</span></span>
                  {member.age && <span><strong>Age:</strong> {member.age} yrs</span>}
                </div>
                <div className="dependents-count mt-2" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', color: '#334155', fontWeight: '700' }}>
                  <Users size={14} style={{ color: '#6366f1' }} /> {member.subFamilyMembers?.length || 0} Dependents Mapped
                </div>
                {(() => {
                  const { totalPaid, totalUnpaid } = getFamilyFinancials(member._id);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Paid</span>
                        <strong style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: '900' }}>₹{totalPaid.toLocaleString()}</strong>
                      </div>
                      <div style={{ background: totalUnpaid > 0 ? 'rgba(225, 29, 72, 0.1)' : 'rgba(241, 245, 249, 0.8)', padding: '10px', borderRadius: '12px', textAlign: 'center', border: totalUnpaid > 0 ? '1px solid rgba(225, 29, 72, 0.2)' : '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '0.75rem', color: totalUnpaid > 0 ? '#be123c' : '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Unpaid Dues</span>
                        <strong style={{ fontSize: '1.2rem', color: totalUnpaid > 0 ? '#e11d48' : '#64748b', fontWeight: '900' }}>₹{totalUnpaid.toLocaleString()}</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        ) : (
          filteredIndividuals.map(v => (
            <div key={v.id} className="individual-card glass-panel hover-scale" onClick={() => { setSelectedMember(members.find(m => m.familyId === v.familyId)); setSelectedIndividualId(v.id); }} style={{ cursor: 'pointer', background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', borderLeft: `6px solid ${v.gender === 'female' ? '#f43f5e' : v.gender === 'male' ? '#818cf8' : '#38bdf8'}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#334155', fontWeight: '800', fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px' }}>Fam #{v.familyId}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '12px', background: v.gender === 'female' ? 'rgba(244, 63, 94, 0.12)' : v.gender === 'male' ? 'rgba(129, 140, 248, 0.12)' : 'rgba(56, 189, 248, 0.12)', color: v.gender === 'female' ? '#f43f5e' : v.gender === 'male' ? '#818cf8' : '#38bdf8' }}>
                  {v.gender}
                </span>
              </div>
              <h3 style={{ margin: '6px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>{v.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginTop: '10px', fontWeight: '600' }}>
                <span style={{ color: v.isHead ? '#4f46e5' : '#334155' }}>{v.isHead ? '👑 Household Head' : `• ${v.relation}`}</span>
                {v.age !== null ? <span>{v.age} yrs old</span> : <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Age unrecorded</span>}
              </div>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                <span>Mem ID: #{v.memberId || 'N/A'}</span>
                {v.isHead && <span style={{ color: '#10b981' }}>{v.subCount} Dependents</span>}
              </div>
            </div>
          ))
        )}
        {viewMode === 'individuals' && filteredIndividuals.length === 0 && (
          <div className="empty-state glass-panel text-center col-span-full py-12" style={{ gridColumn: '1/-1', padding: '40px 0', color: '#94a3b8', fontSize: '1.1rem' }}>
            No individual villagers match your active demographic filters.
          </div>
        )}
        {viewMode === 'households' && filteredMembers.length === 0 && (
          <div className="empty-state glass-panel text-center col-span-full py-12" style={{ gridColumn: '1/-1', padding: '40px 0', color: '#94a3b8', fontSize: '1.1rem' }}>
            No household records found matching your query.
          </div>
        )}
      </div>

      {/* Modal Overlay via Portal to escape CSS transform context */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Family Record' : 'Create New Member'}</h2>
              <button className="icon-btn close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="input-group">
                  <label>Family ID</label>
                  <input type="text" className="input-field" name="familyId" value={formData.familyId} onChange={handleInputChange} disabled required />
                </div>
                <div className="input-group">
                  <label>Member ID (Head)</label>
                  <input type="text" className="input-field" name="memberId" value={formData.memberId} onChange={handleInputChange} disabled required />
                </div>

                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="text" className="input-field" name="phone" value={formData.phone} onChange={handleInputChange} pattern="[0-9]{10}" maxLength="10" title="Phone number must be exactly 10 digits" required />
                </div>
                <div className="input-group">
                  <label>Gender</label>
                  <select className="input-field" name="gender" value={formData.gender || 'male'} onChange={handleInputChange} required>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Age</label>
                  <input type="number" placeholder="Age" className="input-field" name="age" value={formData.age} onChange={handleInputChange} min="1" max="120" />
                </div>
                <div className="input-group col-span-2">
                  <label>Password</label>
                  <input type="password" placeholder={isEditMode ? "Leave blank to keep current" : "Password"} className="input-field" name="password" value={formData.password} onChange={handleInputChange} required={!isEditMode} />
                </div>
              </div>

              <div className="sub-members-section">
                <div className="sub-header">
                  <h3>Sub-Family Members</h3>
                  <button type="button" className="btn-secondary" onClick={handleAddSubMember}>+ Add</button>
                </div>
                
                {formData.subFamilyMembers.map((sub, index) => (
                  <div key={index} className="sub-member-row">
                    <input type="text" placeholder="Mem. ID" className="input-field" value={sub.memberId || ''} onChange={(e) => handleSubMemberChange(index, 'memberId', e.target.value)} disabled required />
                    <input type="text" placeholder="Name" className="input-field" value={sub.name} onChange={(e) => handleSubMemberChange(index, 'name', e.target.value)} required />
                    <select className="input-field" value={sub.relation} onChange={(e) => handleSubMemberChange(index, 'relation', e.target.value)} required>
                      <option value="" disabled>Relation</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Grandfather">Grandfather</option>
                      <option value="Grandmother">Grandmother</option>
                      <option value="Grandson">Grandson</option>
                      <option value="Granddaughter">Granddaughter</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Aunt">Aunt</option>
                      <option value="Nephew">Nephew</option>
                      <option value="Niece">Niece</option>
                      <option value="Cousin">Cousin</option>
                      <option value="Father-in-law">Father-in-law</option>
                      <option value="Mother-in-law">Mother-in-law</option>
                      <option value="Brother-in-law">Brother-in-law</option>
                      <option value="Sister-in-law">Sister-in-law</option>
                      <option value="Son-in-law">Son-in-law</option>
                      <option value="Daughter-in-law">Daughter-in-law</option>
                      <option value="Other">Other</option>
                    </select>
                    <select className="input-field" value={sub.gender || 'male'} onChange={(e) => handleSubMemberChange(index, 'gender', e.target.value)} style={{ width: '100px' }} required>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <input type="number" placeholder="Age" className="input-field" value={sub.age} onChange={(e) => handleSubMemberChange(index, 'age', e.target.value)} style={{ width: '80px' }} />
                    <button type="button" className="icon-btn delete" onClick={() => handleRemoveSubMember(index)}><X size={16} /></button>
                  </div>
                ))}
              </div>

              {!isEditMode && (
                <div className="specific-funds-section" style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#0f172a' }}>Assign Specific Funds</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>By default, all existing funds are assigned. Toggle to select specific funds.</p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={assignSpecificFunds} 
                        onChange={(e) => setAssignSpecificFunds(e.target.checked)} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                      />
                      <span style={{ marginLeft: '8px', fontWeight: '600', color: '#334155' }}>Override Default</span>
                    </label>
                  </div>
                  
                  {assignSpecificFunds && (
                    <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px' }}>
                      {funds.map(fund => (
                        <label key={fund._id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedFunds.includes(fund._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedFunds([...selectedFunds, fund._id]);
                              else setSelectedFunds(selectedFunds.filter(id => id !== fund._id));
                            }}
                            style={{ marginRight: '10px' }}
                          />
                          <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>{fund.name}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>₹{fund.targetAmount}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (isEditMode ? 'Update Family' : 'Save Family')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Details Modal via Portal */}
      {selectedMember && createPortal(
        <div className="modal-overlay" onClick={() => { setSelectedMember(null); setSelectedIndividualId(null); }}>
          <div className="modal-content glass-panel details-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Family Details & Financial Audit</h2>
              <button className="icon-btn close-btn" onClick={() => { setSelectedMember(null); setSelectedIndividualId(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body details-body">
              <div className="details-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <span className="badge" style={{ fontSize: '1rem', padding: '6px 16px', borderRadius: '12px' }}>Family ID: #{selectedMember.familyId}</span>
                {(() => {
                  const { totalDue, totalPaid, totalUnpaid } = getFamilyFinancials(selectedMember._id);
                  return (
                    <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                      <span style={{ fontSize: '0.9rem', color: '#334155' }}>Expected: <strong>₹{totalDue.toLocaleString()}</strong></span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span style={{ fontSize: '0.9rem', color: '#10b981' }}>Paid: <strong>₹{totalPaid.toLocaleString()}</strong></span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span style={{ fontSize: '0.9rem', color: totalUnpaid > 0 ? '#e11d48' : '#64748b' }}>Unpaid: <strong style={{ color: totalUnpaid > 0 ? '#e11d48' : '#64748b' }}>₹{totalUnpaid.toLocaleString()}</strong></span>
                    </div>
                  );
                })()}
              </div>
              <div className="details-grid" style={{ marginBottom: '28px', ...(selectedIndividualId === selectedMember._id + '_head' ? { background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', padding: '16px' } : {}) }}>
                <div className="detail-item"><strong>Head Name:</strong> {selectedMember.name}</div>
                <div className="detail-item"><strong>Head Mem ID:</strong> {selectedMember.memberId}</div>
                <div className="detail-item"><strong>Phone:</strong> {selectedMember.phone}</div>
                <div className="detail-item"><strong>Gender:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedMember.gender || 'male'}</span></div>
                {selectedMember.age && <div className="detail-item"><strong>Age:</strong> {selectedMember.age} yrs</div>}
                <div className="detail-item"><strong>Total Household Size:</strong> {1 + (selectedMember.subFamilyMembers?.length || 0)} Persons</div>
              </div>

              {/* Fund Allocations Audit Section */}
              <div className="fund-allocations-section mb-6" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💰 Allocated Funds Ledger ({getFamilyFinancials(selectedMember._id).familyDues.length} Funds)</span>
                </h3>
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
                  {(() => {
                    const { familyDues } = getFamilyFinancials(selectedMember._id);
                    if (familyDues.length === 0) {
                      return <div className="text-center py-6 text-muted" style={{ padding: '20px 0', color: '#94a3b8', fontStyle: 'italic' }}>No active fund allocations mapped for this family.</div>;
                    }
                    return familyDues.map(d => {
                      const matchedFund = funds.find(f => f._id === (d.fundId?._id || d.fundId));
                      const fundName = matchedFund?.name || d.fundId?.name || 'Village Fund';
                      const isFullyPaid = (d.amountPaid || 0) >= (d.totalDueAmount || 0);
                      const pendingAmt = Math.max(0, (d.totalDueAmount || 0) - (d.amountPaid || 0));
                      return (
                        <div key={d._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', borderLeft: `5px solid ${isFullyPaid ? '#10b981' : '#ef4444'}`, borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                          <div>
                            <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '800', display: 'block' }}>{fundName}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Expected Target: ₹{(d.totalDueAmount || 0).toLocaleString()}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.1rem', color: isFullyPaid ? '#10b981' : '#e11d48', fontWeight: '900', display: 'block' }}>
                              Paid: ₹{(d.amountPaid || 0).toLocaleString()}
                            </span>
                            <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', background: isFullyPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: isFullyPaid ? '#047857' : '#be123c', fontWeight: '700', marginTop: '4px', display: 'inline-block' }}>
                              {isFullyPaid ? '✓ Fully Cleared' : `⚠️ Pending ₹${pendingAmt.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {selectedMember.subFamilyMembers?.length > 0 && (
                <div className="sub-members-section mt-2">
                  <h3>Sub-Family Members</h3>
                  <div className="sub-members-list">
                    {selectedMember.subFamilyMembers.map((sub, i) => (
                      <div key={i} className="sub-member-card" style={{ animationDelay: `${0.15 + (i * 0.08)}s`, position: 'relative', borderLeft: `4px solid ${sub.gender === 'female' ? '#f43f5e' : '#818cf8'}`, ...(selectedIndividualId === selectedMember._id + '_' + sub.memberId ? { background: '#fffbeb', border: '2px solid #f59e0b' } : {}) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{sub.name}</strong>
                          <span className="badge" style={{ textTransform: 'capitalize' }}>{sub.gender || 'male'}</span>
                        </div>
                        <div><strong>Relation:</strong> {sub.relation}</div>
                        <div><strong>Mem ID:</strong> #{sub.memberId}</div>
                        {sub.age && <div><strong>Age:</strong> {sub.age} yrs</div>}
                        <button 
                          className="icon-btn delete" 
                          style={{position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', padding: 0, borderRadius: '50%'}}
                          onClick={(e) => { e.stopPropagation(); setSubMemberToDelete({ familyRecord: selectedMember, subMember: sub }); }}
                          title="Remove Sub-Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal via Portal */}
      {memberToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setMemberToDelete(null)}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Delete Family?</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5'}}>
              Are you sure you want to permanently delete Family ID <strong>{memberToDelete.familyId}</strong> and all its members? This action cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => setMemberToDelete(null)} disabled={loading}>Cancel</button>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white'}} onClick={confirmDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sub-Member Delete Confirmation Modal via Portal */}
      {subMemberToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setSubMemberToDelete(null)}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Remove Sub-Member?</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5'}}>
              Are you sure you want to remove <strong>{subMemberToDelete.subMember.name}</strong> (ID: {subMemberToDelete.subMember.memberId}) from this family? This action cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => setSubMemberToDelete(null)} disabled={loading}>Cancel</button>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white'}} onClick={confirmSubMemberDelete} disabled={loading}>
                {loading ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stylish Error Modal */}
      {errorMsg && createPortal(
        <div className="modal-overlay" onClick={() => setErrorMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', padding: '15px' }}>
                <X size={40} />
              </div>
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Action Failed</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5', fontSize: '1.05rem'}}>
              {errorMsg}
            </p>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white', width: '100%', padding: '12px'}} onClick={() => setErrorMsg('')}>
                Okay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageMembers;
