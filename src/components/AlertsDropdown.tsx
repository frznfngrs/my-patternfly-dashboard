import React, { useState } from 'react';
import {
  Dropdown,
  DropdownList,
  DropdownItem,
  NotificationBadge,
  NotificationBadgeVariant
} from '@patternfly/react-core';
import { BellIcon } from '@patternfly/react-icons';

export interface Alert {
  device: string;
  alert: string;
}

interface AlertsDropdownProps {
  alerts: Alert[];
}

const AlertsDropdown: React.FC<AlertsDropdownProps> = ({ alerts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen(prev => !prev);
  const badgeVariant = alerts.length > 0 ? NotificationBadgeVariant.unread : NotificationBadgeVariant.read;

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <div
          ref={toggleRef}
          onClick={onToggle}
          style={{ position: 'relative', cursor: 'pointer', display: 'inline-block' }}
        >
          <NotificationBadge
            variant={badgeVariant}
            count={alerts.length}
            icon={<BellIcon />}
            aria-label={`You have ${alerts.length} unread alerts`}
          />
        </div>
      )}
    >
      <DropdownList className="custom-dropdown-list">
        {alerts.length === 0 ? (
          <DropdownItem key="no-alerts" isDisabled>
            No alerts
          </DropdownItem>
        ) : (
          alerts.map((alert, index) => (
            <DropdownItem key={index}>
              {alert.device} - {alert.alert}
            </DropdownItem>
          ))
        )}
      </DropdownList>
    </Dropdown>
  );
};

export default AlertsDropdown;
