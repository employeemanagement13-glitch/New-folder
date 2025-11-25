// Components/department-manager/announcements/EditNotificationModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Send, Calendar, Clock } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface EditNotificationModalProps {
  notification: any;
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  userRole: string;
  managerDepartmentId: string;
  managerDepartmentName: string;
}

export default function EditNotificationModal({
  notification,
  onClose,
  onSuccess,
  departments,
  userRole,
  managerDepartmentId,
  managerDepartmentName
}: EditNotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: '',
    priority: '',
    delivery_method: '',
    expiry_date: '',
  });

  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'department',
        priority: notification.priority || 'normal',
        delivery_method: notification.delivery_method || 'both',
        expiry_date: notification.expiry_date || ''
      });
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        priority: formData.priority,
        delivery_method: formData.delivery_method,
        expiry_date: formData.expiry_date || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('notifications')
        .update(updateData)
        .eq('id', notification.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update failed:', err);
      alert(`Failed to update announcement: ${err.message}`);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-bold text-white">
            Edit Department Announcement
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Department Info */}
        <div className="p-6 border-b border-[#333333] bg-[#ff9d00]/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#ff9d00] rounded-full"></div>
            <div>
              <p className="text-[#ff9d00] font-medium">
                Editing announcement for: {managerDepartmentName}
              </p>
              <p className="text-[#ff9d00]/70 text-sm">
                This announcement is only visible to members of your department
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none"
              placeholder="Enter announcement title"
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
              rows={4}
              className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none resize-vertical"
              placeholder="Enter announcement message"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none"
              >
                <option value="department">Department</option>
                <option value="alert">Alert</option>
                <option value="event">Event</option>
                <option value="notice">Notice</option>
                <option value="announcement">Announcement</option>
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
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delivery
              </label>
              <select
                value={formData.delivery_method}
                onChange={(e) => handleChange('delivery_method', e.target.value)}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none"
              >
                <option value="both">Email & Push</option>
                <option value="email">Email Only</option>
                <option value="push">Push Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-2" />
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white focus:border-[#ff9d00] focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Send size={16} />
              {loading ? 'Updating...' : 'Update Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}