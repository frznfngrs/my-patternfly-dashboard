import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  CardTitle, 
  Button, 
  TextInput, 
  Form, 
  FormGroup,
  Alert,
  HelperText,
  HelperTextItem
} from '@patternfly/react-core';
import { authenticate } from './api';

interface SetupProps {
  onSave: (config: { apiUrl: string; username: string; password: string }) => void;
}

function Setup({ onSave }: SetupProps) {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Remove any existing protocol if user included it
      const cleanApiUrl = apiUrl.replace(/^https?:\/\//, '');
      localStorage.setItem('apiUrl', cleanApiUrl);
      localStorage.setItem('username', username);

      const result = await authenticate(username, password);
      
      if (!result.success) {
        setError(result.message || 'Authentication failed');
        return;
      }

      onSave({ apiUrl: cleanApiUrl, username, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardBody>
        <CardTitle>UCP Advisor API Setup</CardTitle>
        {error && (
          <Alert 
            variant="danger" 
            title="Connection Error" 
            className="pf-u-mb-md"
          >
            {error}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <FormGroup 
            label="Advisor API Address" 
            isRequired 
            fieldId="api-url"
          >
            <TextInput
              id="api-url"
              value={apiUrl}
              onChange={(_, value) => setApiUrl(value)}
              placeholder="e.g. 192.168.1.100"
              isDisabled={isSubmitting}
            />
            <HelperText>
              <HelperTextItem>Enter IP address or hostname (without http:// or https://)</HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup 
            label="Username" 
            isRequired 
            fieldId="username"
          >
            <TextInput
              id="username"
              value={username}
              onChange={(_, value) => setUsername(value)}
              isDisabled={isSubmitting}
            />
          </FormGroup>
          <FormGroup 
            label="Password" 
            isRequired 
            fieldId="password"
          >
            <TextInput
              id="password"
              type="password"
              value={password}
              onChange={(_, value) => setPassword(value)}
              isDisabled={isSubmitting}
            />
          </FormGroup>
          <Button 
            variant="primary" 
            type="submit"
            isLoading={isSubmitting}
            isDisabled={isSubmitting || !apiUrl || !username || !password}
          >
            Save & Authenticate
          </Button>
        </Form>
      </CardBody>
    </Card>
  );
}

export default Setup;
