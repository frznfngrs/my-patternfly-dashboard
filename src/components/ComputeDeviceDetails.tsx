import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  CardHeader,
  Grid,
  GridItem,
  Label,
  Button,
  Spinner,
  Dropdown,
  DropdownItem,
  Alert,
  Title,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Modal,
  ModalVariant
} from '@patternfly/react-core';
import {
  PowerOffIcon,
  PlayIcon as PowerIcon,
  SyncIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@patternfly/react-icons';
import { fetchUcpSystems, setComputePowerState, ComputeDevice, GpuInfo } from '../api';


interface ComputeDeviceDetailsProps {
  device: ComputeDevice;
  isOpen: boolean;
  onClose: () => void;
}

function getHealthIcon(status: string = '') {
  switch (status.toLowerCase()) {
    case 'normal':
      return <CheckCircleIcon color="green" />;
    case 'warning':
      return <ExclamationTriangleIcon color="orange" />;
    case 'critical':
      return <ExclamationCircleIcon color="red" />;
    default:
      return null;
  }
}

function getStatusColor(status: string = '') {
  switch (status.toLowerCase()) {
    case 'normal':
      return 'green';
    case 'warning':
      return 'orange';
    case 'critical':
      return 'red';
    default:
      return 'blue';
  }
}

export function ComputeDeviceDetails({ device, isOpen, onClose }: ComputeDeviceDetailsProps) {
  const [isPowerActionInProgress, setIsPowerActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handlePowerAction = async (action: 'ON' | 'OFF' | 'CYCLE') => {
    setError(null);
    setIsPowerActionInProgress(true);
    try {
      const result = await setComputePowerState(device.resourceId, action);
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      setError('Failed to perform power action');
    } finally {
      setIsPowerActionInProgress(false);
    }
  };

  const powerStatus = device.powerStatus || '';
  const powerItems = [
    <DropdownItem 
      key="powerOn" 
      icon={<PowerIcon />}
      isDisabled={powerStatus.toLowerCase() === 'on' || isPowerActionInProgress}
      onClick={() => handlePowerAction('ON')}
    >
      Power On
    </DropdownItem>,
    <DropdownItem 
      key="powerOff" 
      icon={<PowerOffIcon />}
      isDisabled={powerStatus.toLowerCase() === 'off' || isPowerActionInProgress}
      onClick={() => handlePowerAction('OFF')}
    >
      Power Off
    </DropdownItem>,
    <DropdownItem 
      key="powerCycle" 
      icon={<SyncIcon />}
      isDisabled={powerStatus.toLowerCase() === 'off' || isPowerActionInProgress}
      onClick={() => handlePowerAction('CYCLE')}
    >
      Power Cycle
    </DropdownItem>
  ];

  return (
    <Modal
      variant={ModalVariant.large}
      title={`${device.model || 'Unknown'} Details`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <Grid hasGutter>
        {error && (
          <GridItem span={12}>
            <Alert variant="danger" title={error} isInline />
          </GridItem>
        )}
        
        <GridItem span={12}>
          <Card>
            <CardHeader>
              <Title headingLevel="h2">
                {device.model || 'Unknown'} - {device.serialNumber || 'Unknown'}
              </Title>
              <Label color={getStatusColor(device.resourceState)}>{device.resourceState || 'Unknown'}</Label>
            </CardHeader>
            <CardBody>
              <Grid hasGutter>
                <GridItem span={8}>
                  <Card>
                    <CardTitle>System Information</CardTitle>
                    <CardBody>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Power Status</DescriptionListTerm>
                          <DescriptionListDescription>
                            <Label 
                              color={powerStatus.toLowerCase() === 'on' ? 'green' : 'red'}
                            >
                              {powerStatus || 'Unknown'}
                            </Label>
                            {isPowerActionInProgress ? (
                              <Spinner size="sm" style={{ marginLeft: '8px' }} />
                            ) : (
                              <Dropdown
                                isOpen={isDropdownOpen}
                                onSelect={() => setIsDropdownOpen(false)}
                                toggle={(toggleRef: React.Ref<HTMLButtonElement>) => (
                                  <Button 
                                    ref={toggleRef} 
                                    variant="secondary" 
                                    className="pf-u-ml-sm"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                  >
                                    Power Actions
                                  </Button>
                                )}
                              >
                                {powerItems}
                              </Dropdown>
                            )}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                        
                        <DescriptionListGroup>
                          <DescriptionListTerm>Model</DescriptionListTerm>
                          <DescriptionListDescription>{device.model || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Serial Number</DescriptionListTerm>
                          <DescriptionListDescription>{device.serialNumber || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Host OS</DescriptionListTerm>
                          <DescriptionListDescription>{device.hostOs || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Data Center</DescriptionListTerm>
                          <DescriptionListDescription>{device.datacenter || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Cluster</DescriptionListTerm>
                          <DescriptionListDescription>{device.cluster || 'Unknown'}</DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={4}>
                  <Card>
                    <CardTitle>Health Status</CardTitle>
                    <CardBody>
                      <DescriptionList>
                        <DescriptionListGroup>
                          <DescriptionListTerm>Drives</DescriptionListTerm>
                          <DescriptionListDescription>
                            {getHealthIcon(device.driveHealthStatus)} {device.driveHealthStatus || 'Unknown'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Fans</DescriptionListTerm>
                          <DescriptionListDescription>
                            {getHealthIcon(device.fanHealthStatus)} {device.fanHealthStatus || 'Unknown'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Temperature</DescriptionListTerm>
                          <DescriptionListDescription>
                            {getHealthIcon(device.temperatureHealthStatus)} {device.temperatureHealthStatus || 'Unknown'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>

                        <DescriptionListGroup>
                          <DescriptionListTerm>Power Supply</DescriptionListTerm>
                          <DescriptionListDescription>
                            {getHealthIcon(device.powerSupplyHealthStatus)} {device.powerSupplyHealthStatus || 'Unknown'}
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </DescriptionList>
                    </CardBody>
                  </Card>
                </GridItem>

                <GridItem span={12}>
                  <Card>
                    <CardTitle>Hardware Information</CardTitle>
                    <CardBody>
                      <Grid hasGutter>
                        <GridItem span={6}>
                          <DescriptionList>
                            <DescriptionListGroup>
                              <DescriptionListTerm>CPUs</DescriptionListTerm>
                              <DescriptionListDescription>{device.cpus || 0}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>Memory</DescriptionListTerm>
                              <DescriptionListDescription>
                                {Math.round((device.totalMemoryInMb || 0) / 1024)} GB
                              </DescriptionListDescription>
                            </DescriptionListGroup>

                            {(device.gpus > 0 && device.gpuInfo) && (
                              <DescriptionListGroup>
                                <DescriptionListTerm>GPUs</DescriptionListTerm>
                                <DescriptionListDescription>
                                  {device.gpuInfo.map((gpu: GpuInfo, index: number) => (
                                    <div key={index}>
                                      {gpu.model || 'Unknown'} - {gpu.vendor || 'Unknown'} ({Math.round(parseInt(gpu.memorySizeInKB || '0') / 1024 / 1024)} GB)
                                    </div>
                                  ))}
                                </DescriptionListDescription>
                              </DescriptionListGroup>
                            )}
                          </DescriptionList>
                        </GridItem>

                        <GridItem span={6}>
                          <DescriptionList>
                            <DescriptionListGroup>
                              <DescriptionListTerm>BMC Firmware</DescriptionListTerm>
                              <DescriptionListDescription>{device.bmcFirmwareVersion || 'Unknown'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>BIOS Firmware</DescriptionListTerm>
                              <DescriptionListDescription>{device.biosFirmwareVersion || 'Unknown'}</DescriptionListDescription>
                            </DescriptionListGroup>

                            <DescriptionListGroup>
                              <DescriptionListTerm>CPLD Firmware</DescriptionListTerm>
                              <DescriptionListDescription>{device.cpldFirmwareVersion || 'Unknown'}</DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </GridItem>
                      </Grid>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Modal>
  );
}
