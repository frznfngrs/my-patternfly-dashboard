import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  PageSection,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Spinner,
  Alert,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Button
} from '@patternfly/react-core';
import { ArrowLeftIcon } from '@patternfly/react-icons';
import { fetchInfrastructureStatus } from '../api';
import { ComputeDeviceList } from './ComputeDeviceList';

const getStatusVariant = (status: string = ''): "green" | "orange" | "red" | "blue" => {
  switch (status.toLowerCase()) {
    case 'normal': return 'green';
    case 'warning': return 'orange';
    case 'critical': return 'red';
    default: return 'blue';
  }
};

interface UcpSystem {
  resourceId: string;
  name: string;
  model: string;
  serialNumber: string;
  region: string;
  gatewayAddress: string;
  resourceState: string;
  computeDevices: any[];
  storageDevices: any[];
  ethernetSwitches: any[];
  fibreChannelSwitches: any[];
}

export function SystemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState(0);

  const [system, setSystem] = React.useState<UcpSystem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function loadSystemDetails() {
      if (!id) {
        setError('No system ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetchInfrastructureStatus();
        if (response.error) {
          setError(response.error);
          return;
        }

        const foundSystem = response.data.find(sys => sys.resourceId === id);
        if (!foundSystem) {
          setError('System not found');
          return;
        }

        setSystem(foundSystem);
      } catch (err) {
        setError('Failed to load system details');
      } finally {
        setLoading(false);
      }
    }

    loadSystemDetails();
  }, [id]);

  const handleTabClick = (_event: React.MouseEvent<HTMLElement>, tabIndex: string | number) => {
    setActiveTab(typeof tabIndex === 'string' ? parseInt(tabIndex, 10) : tabIndex);
  };

  if (loading) return <Spinner />;
  if (error) return <Alert variant="danger" title={error} />;
  if (!system) return null;
  if (!id) return <Alert variant="danger" title="No system ID provided" />;

  return (
    <PageSection>
      <Grid hasGutter>
        <GridItem span={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
              icon={<ArrowLeftIcon />}
            >
              Back to Dashboard
            </Button>
            <Title headingLevel="h1">System Details</Title>
          </div>
        </GridItem>
        <GridItem span={12}>
          <Card>
            <CardBody>
              <Tabs activeKey={activeTab} onSelect={handleTabClick} isBox>
                <Tab 
                  eventKey={0} 
                  title={<TabTitleText>Overview</TabTitleText>}
                >
                  <Card>
                    <CardTitle>System Information</CardTitle>
                    <CardBody>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Name</DescriptionListTerm>
                          <DescriptionListDescription>{system.name || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Model</DescriptionListTerm>
                          <DescriptionListDescription>{system.model || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Serial Number</DescriptionListTerm>
                          <DescriptionListDescription>{system.serialNumber || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Region</DescriptionListTerm>
                          <DescriptionListDescription>{system.region || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Gateway Address</DescriptionListTerm>
                          <DescriptionListDescription>{system.gatewayAddress || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Resource State</DescriptionListTerm>
                          <DescriptionListDescription>
                            <Label color={getStatusVariant(system.resourceState)}>
                              {system.resourceState || 'Unknown'}
                            </Label>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </Tab>
                <Tab 
                  eventKey={1} 
                  title={<TabTitleText>Compute</TabTitleText>}
                >
                  <ComputeDeviceList systemId={id} />
                </Tab>
                <Tab 
                  eventKey={2} 
                  title={<TabTitleText>Storage</TabTitleText>}
                >
                  {/* Storage devices will go here */}
                </Tab>
                <Tab 
                  eventKey={3} 
                  title={<TabTitleText>Network</TabTitleText>}
                >
                  {/* Network devices will go here */}
                </Tab>
                <Tab 
                  eventKey={4} 
                  title={<TabTitleText>FC Switches</TabTitleText>}
                >
                  {/* FC switches will go here */}
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </PageSection>
  );
}
