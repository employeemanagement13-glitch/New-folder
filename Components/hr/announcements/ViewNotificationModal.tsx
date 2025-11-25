// Components/hr/announcements/ViewNotificationModal.tsx
'use client';

import { Eye, X, Calendar, Users, Bell, Clock, Mail, Edit } from 'lucide-react';

interface ViewNotificationModalProps {
  notification: any;
  onClose: () => void;
  onEdit: () => void;
}

export default function ViewNotificationModal({ 
  notification, 
  onClose, 
  onEdit 
}: ViewNotificationModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'text-red-500 bg-red-500/10 border border-red-500/20',
      high: 'text-orange-500 bg-orange-500/10 border border-orange-500/20',
      normal: 'text-yellow-500 bg-yellow-500/10 border border-yellow-500/20',
      low: 'text-green-500 bg-green-500/10 border border-green-500/20'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      alert: 'text-red-400 bg-red-400/10 border border-red-400/20',
      event: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
      notice: 'text-purple-400 bg-purple-400/10 border border-purple-400/20',
      announcement: 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20',
      payroll: 'text-green-400 bg-green-400/10 border border-green-400/20',
      leave: 'text-orange-400 bg-orange-400/10 border border-orange-400/20'
    };
    return colors[type as keyof typeof colors] || colors.announcement;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: 'text-green-500 bg-green-500/10 border border-green-500/20',
      scheduled: 'text-blue-500 bg-blue-500/10 border border-blue-500/20',
      draft: 'text-gray-500 bg-gray-500/10 border border-gray-500/20',
      failed: 'text-red-500 bg-red-500/10 border border-red-500/20',
      cancelled: 'text-gray-400 bg-gray-400/10 border border-gray-400/20'
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getDeliveryMethodText = (method: string) => {
    switch (method) {
      case 'email': return 'Email Only';
      case 'push': return 'Push Notification Only';
      case 'both': return 'Email & Push Notification';
      default: return method;
    }
  };

  const getAudienceText = (notification: any) => {
    if (notification.target_audience === 'all') return 'All Employees';
    if (notification.departments?.name) return notification.departments.name;
    return 'Specific Department';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#111111] border border-[#333333] rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#333333] sticky top-0 bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              notification.type === 'alert' ? 'bg-red-500/10 text-red-400' :
              notification.type === 'event' ? 'bg-blue-500/10 text-blue-400' :
              'bg-[#ff9d00]/10 text-[#ff9d00]'
            }`}>
              <Bell size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{notification.title}</h2>
              <p className="text-gray-400 text-sm">
                Created by {notification.created_by_name} • {formatDate(notification.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#333333] rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Message</h3>
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4 whitespace-pre-wrap">
              {notification.message}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Eye size={18} />
                  Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                    <span className="text-gray-400">Type</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                      {notification.type}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                    <span className="text-gray-400">Priority</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                    <span className="text-gray-400">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                    <span className="text-gray-400">Audience</span>
                    <span className="text-white">{getAudienceText(notification)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Mail size={18} />
                  Delivery
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                    <span className="text-gray-400">Method</span>
                    <span className="text-white">{getDeliveryMethodText(notification.delivery_method)}</span>
                  </div>
                  
                  {notification.scheduled_at && (
                    <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Clock size={14} />
                        Scheduled For
                      </span>
                      <span className="text-white">{formatDate(notification.scheduled_at)}</span>
                    </div>
                  )}
                  
                  {notification.expiry_date && (
                    <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Calendar size={14} />
                        Expires
                      </span>
                      <span className="text-white">{formatDate(notification.expiry_date)}</span>
                    </div>
                  )}
                  
                  {notification.sent_at && (
                    <div className="flex justify-between items-center py-2 border-b border-[#333333]">
                      <span className="text-gray-400">Sent At</span>
                      <span className="text-white">{formatDate(notification.sent_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics (if available) */}
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users size={18} />
              Delivery Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#ff9d00]">-</div>
                <div className="text-gray-400 text-sm">Total Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">-</div>
                <div className="text-gray-400 text-sm">Delivered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">-</div>
                <div className="text-gray-400 text-sm">Opened</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">-</div>
                <div className="text-gray-400 text-sm">Failed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#333333]">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#333333] rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="bg-[#ff9d00] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#ff9d00]/90 transition-colors flex items-center gap-2"
          >
            <Edit size={16} />
            Edit Announcement
          </button>
        </div>
      </div>
    </div>
  );
}