// Components/hr/announcements/EditNotificationModal.tsx (Updated)
'use client';

import { useState, useEffect } from 'react';
import { X, Send, Calendar, Clock, AlertCircle, Users, Mail, Bell } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface EditNotificationModalProps {
  notification: any;
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  userRole: string; // Add userRole prop
}

export default function EditNotificationModal({ 
  notification, 
  onClose, 
  onSuccess, 
  departments,
  userRole 
}: EditNotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'announcement',
    priority: 'normal',
    target_audience: 'all',
    target_department_id: '',
    delivery_method: 'both',
    status: 'draft',
    expiry_date: '',
  });

  // Initialize form with notification data
  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'announcement',
        priority: notification.priority || 'normal',
        target_audience: notification.target_audience || 'all',
        target_department_id: notification.target_department_id || '',
        delivery_method: notification.delivery_method || 'both',
        status: notification.status || 'draft',
        expiry_date: notification.expiry_date || '',
      });
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString(),
        // Ensure target_department_id is null for 'all' audience
        target_department_id: formData.target_audience === 'all' ? null : formData.target_department_id,
      };

      console.log('Updating notification:', updateData);

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update(updateData)
        .eq('id', notification.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Notification updated:', data);
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Failed to update notification:', error);
      alert(`Failed to update announcement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <div>
            <h2 className="text-xl font-bold text-white">Edit Announcement</h2>
            <p className="text-gray-400 text-sm mt-1">
              Update announcement details and settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Announcement Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter announcement title..."
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              required
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Enter announcement message..."
              rows={4}
              className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
              >
                <option value="announcement">Announcement</option>
                <option value="alert">Alert</option>
                <option value="event">Event</option>
                <option value="notice">Notice</option>
                <option value="payroll">Payroll</option>
                <option value="leave">Leave</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Audience
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
              >
                <option value="all">All Employees</option>
                <option value="department">Specific Department</option>
              </select>
            </div>

            {/* Department (conditionally shown) */}
            {formData.target_audience === 'department' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Department
                </label>
                <select
                  value={formData.target_department_id}
                  onChange={(e) => handleChange('target_department_id', e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delivery Method
              </label>
              <select
                value={formData.delivery_method}
                onChange={(e) => handleChange('delivery_method', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
              >
                <option value="email">Email Only</option>
                <option value="push">Push Notification Only</option>
                <option value="both">Email & Push</option>
              </select>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiry Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff9d00] focus:ring-2 focus:ring-[#ff9d00]/20"
              />
            </div>
          </div>

          {/* Original Creator Info */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333333]">
            <div className="text-sm text-gray-400">
              Originally created by: <span className="text-[#ff9d00] font-medium">{notification.created_by}</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Last updated by: <span className="text-[#ff9d00] font-medium">{userRole}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-[#333333] text-gray-300 rounded-xl font-semibold hover:bg-[#222222] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#ff9d00] to-orange-500 text-black px-6 py-3 rounded-xl font-semibold hover:from-[#ff9d00]/90 hover:to-orange-500/90 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Update Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}