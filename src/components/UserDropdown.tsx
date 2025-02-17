import React, { useState } from 'react';
import { Dropdown, DropdownList, DropdownItem, MenuToggle } from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import { SignOutAltIcon } from '@patternfly/react-icons/dist/esm/icons/sign-out-alt-icon';
import { useNavigate } from 'react-router-dom';

const UserDropdown: React.FC = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const onToggleClick = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const onSelect = () => {
    setIsUserMenuOpen(false);
  };

  const onLogout = () => {
    // Perform logout logic
    localStorage.removeItem('bearerToken'); // Clear stored auth token
    navigate('/login');
  };

  return (
    <Dropdown
      isOpen={isUserMenuOpen}
      onOpenChange={(isOpen) => setIsUserMenuOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isUserMenuOpen}>
          <UserIcon /> Admin
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key="profile" onClick={onSelect}>Profile</DropdownItem>
        <DropdownItem key="logout" onClick={onLogout}>
          <SignOutAltIcon /> Logout
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};

export default UserDropdown;
