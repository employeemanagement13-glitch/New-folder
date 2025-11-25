// Components/department-manager/announcements/ViewNotificationModal.tsx
'use client';

import { X, Edit, Calendar, Clock, Users, AlertCircle } from 'lucide-react';

interface ViewNotificationModalProps {
  notification: any;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}

export default function ViewNotificationModal({
  notification,
  onClose,
  onEdit,
  canEdit
}: ViewNotificationModalProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'normal': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-green-400 bg-green-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-400 bg-green-500/20';
      case 'scheduled': return 'text-blue-400 bg-blue-500/20';
      case 'draft': return 'text-gray-400 bg-gray-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alert': return 'text-red-400 bg-red-500/20';
      case 'event': return 'text-blue-400 bg-blue-500/20';
      case 'notice': return 'text-purple-400 bg-purple-500/20';
      case 'department': return 'text-[#ff9d00] bg-[#ff9d00]/20';
      default: return 'text-cyan-400 bg-cyan-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#333333] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-bold text-white">
            Announcement Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {notification.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)} Priority
              </span>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <div className="p-4 rounded-lg bg-black border border-[#333333] text-white whitespace-pre-wrap">
              {notification.message}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Users size={16} className="inline mr-2" />
                  Audience
                </label>
                <div className="text-white">
                  {notification.target_audience === 'all' 
                    ? 'All Employees' 
                    : 'Department Specific'
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delivery Method
                </label>
                <div className="text-white capitalize">
                  {notification.delivery_method === 'both' 
                    ? 'Email & Push Notification' 
                    : notification.delivery_method
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Created By
                </label>
                <div className="text-white">
                  {notification.created_by}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Created Date
                </label>
                <div className="text-white">
                  {new Date(notification.created_at).toLocaleString('en-GB')}
                </div>
              </div>

              {notification.expiry_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock size={16} className="inline mr-2" />
                    Expiry Date
                  </label>
                  <div className="text-white">
                    {new Date(notification.expiry_date).toLocaleString('en-GB')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Permission Notice */}
          {!canEdit && (
            <div className="p-4 border border-[#333333] rounded-lg bg-black/50">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-yellow-400" />
                <div>
                  <p className="text-yellow-400 font-medium">Read Only</p>
                  <p className="text-yellow-400/70 text-sm">
                    You can only view this announcement as it was created by another department or HR.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#333333]">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-6 py-3 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg font-medium transition-colors"
            >
              <Edit size={16} />
              Edit Announcement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}