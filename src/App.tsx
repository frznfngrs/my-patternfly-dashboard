import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Page, Masthead, MastheadMain, MastheadBrand, PageSidebar, PageSection, Title } from '@patternfly/react-core';
import Dashboard from './Dashboard'; // Default export
import { SystemDetails } from './components/SystemDetails'; // Named export
import Setup from './Setup';
import { authenticate } from './api';

function App() {
  const [isConfigured, setIsConfigured] = useState(!!localStorage.getItem('bearerToken'));

  const handleSetup = async (config: { apiUrl: string; username: string; password: string }) => {
    localStorage.setItem('apiUrl', config.apiUrl); // Store API URL from setup
    try {
      const authResult = await authenticate(config.username, config.password);
      if (authResult.success) {
        setIsConfigured(true);
      } else {
        alert('Authentication failed: ' + authResult.message);
      }
    } catch (error: unknown) {
      console.error('Authentication Error:', error);
      alert('An unexpected error occurred during authentication.');
    }
  };

  const Header = (
    <Masthead>
      <MastheadMain>
        <MastheadBrand>Infrastructure Manager</MastheadBrand>
      </MastheadMain>
    </Masthead>
  );

  const Sidebar = <PageSidebar />;

  if (!isConfigured) {
    return (
      <Page masthead={Header} sidebar={Sidebar}>
        <PageSection>
          <Title headingLevel="h1" size="lg">Setup UCP Advisor API</Title>
        </PageSection>
        <Setup onSave={handleSetup} />
      </Page>
    );
  }

  return (
    <Router>
      <Page masthead={Header} sidebar={Sidebar}>
        <Routes>
          <Route path="/" element={
            <>
              <PageSection>
                <Title headingLevel="h1" size="lg">Infrastructure System Management</Title>
              </PageSection>
              <Dashboard />
            </>
          } />
          <Route path="/systems/:id" element={<SystemDetails />} />
        </Routes>
      </Page>
    </Router>
  );
}

export default App;
