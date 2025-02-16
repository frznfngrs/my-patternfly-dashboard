import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  Dropdown,
  DropdownItem,
  Alert,
  Spinner,
  MenuToggle,
} from '@patternfly/react-core';
import { ServerIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { fetchInfrastructureStatus, setComputePowerState, ComputeDevice } from '../api';

interface Props {
  systemId: string;
}

export function ComputeDeviceList({ systemId }: Props) {
  const [computeDevices, setComputeDevices] = useState<ComputeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({});
  const [actionInProgress, setActionInProgress] = useState<{ [key: string]: boolean }>({});

  const loadData = async () => {
    try {
      const response = await fetchInfrastructureStatus();
      if (response.error) {
        setError(response.error);
        return;
      }

      const system = response.data.find(sys => sys.resourceId === systemId);
      if (!system) {
        setError('System not found');
        return;
      }

      setComputeDevices(system.computeDevices || []);
    } catch (err) {
      setError('Failed to load compute devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [systemId]);

  const handlePowerAction = async (deviceId: string, action: 'ON' | 'OFF' | 'CYCLE') => {
    setActionInProgress({ ...actionInProgress, [deviceId]: true });
    try {
      const result = await setComputePowerState(deviceId, action);
      if (result.error) {
        setError(result.error);
      } else {
        await loadData(); // Refresh data after successful action
      }
    } catch (err) {
      setError('Failed to execute power action');
    } finally {
      setActionInProgress({ ...actionInProgress, [deviceId]: false });
      setOpenMenus({ ...openMenus, [deviceId]: false });
    }
  };

  const getStatusVariant = (status: string = ''): "green" | "orange" | "red" | "blue" => {
    switch (status.toLowerCase()) {
      case 'normal': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'blue';
    }
  };

  if (loading) return <Spinner />;
  if (error) return <Alert variant="danger" title={error} />;

  return (
    <Grid hasGutter>
      {computeDevices.map(device => (
        <GridItem span={6} key={device.resourceId}>
          <Card isCompact className="hover-card">
            <CardBody>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <ServerIcon className="pf-u-mb-sm" />
                  <CardTitle>{device.model}</CardTitle>
                </div>
                <Dropdown
                  isOpen={openMenus[device.resourceId]}
                  onSelect={() => setOpenMenus({ ...openMenus, [device.resourceId]: false })}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      aria-label="Actions"
                      variant="plain"
                      onClick={() => setOpenMenus({ 
                        ...openMenus, 
                        [device.resourceId]: !openMenus[device.resourceId] 
                      })}
                      isExpanded={openMenus[device.resourceId]}
                      isDisabled={actionInProgress[device.resourceId]}
                    >
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                >
                  <DropdownItem
                    key="power-on"
                    onClick={() => handlePowerAction(device.resourceId, 'ON')}
                    isDisabled={(device.powerStatus || '').toLowerCase() === 'on'}
                  >
                    Power On
                  </DropdownItem>
                  <DropdownItem
                    key="power-off"
                    onClick={() => handlePowerAction(device.resourceId, 'OFF')}
                    isDisabled={(device.powerStatus || '').toLowerCase() === 'off'}
                  >
                    Power Off
                  </DropdownItem>
                  <DropdownItem
                    key="power-cycle"
                    onClick={() => handlePowerAction(device.resourceId, 'CYCLE')}
                    isDisabled={(device.powerStatus || '').toLowerCase() === 'off'}
                  >
                    Power Cycle
                  </DropdownItem>
                </Dropdown>
              </div>

              <div className="pf-u-mt-md">
                <Label color={getStatusVariant(device.resourceState)}>{device.resourceState || 'Unknown'}</Label>
                <Label 
                  color={(device.powerStatus || '').toLowerCase() === 'on' ? 'green' : 'red'}
                  className="pf-u-ml-sm"
                >
                  {device.powerStatus || 'Unknown'}
                </Label>
              </div>

              <div className="pf-u-mt-md">
                <p><strong>Serial:</strong> {device.serialNumber}</p>
                <p><strong>CPUs:</strong> {device.cpus}</p>
                <p><strong>Memory:</strong> {Math.round(device.totalMemoryInMb / 1024)} GB</p>
                {device.gpus > 0 && <p><strong>GPUs:</strong> {device.gpus}</p>}
              </div>

              {device.hostOs && <p><strong>OS:</strong> {device.hostOs}</p>}
              {device.bmcFirmwareVersion && (
                <p><strong>BMC Firmware:</strong> {device.bmcFirmwareVersion}</p>
              )}
              {device.biosFirmwareVersion && (
                <p><strong>BIOS Version:</strong> {device.biosFirmwareVersion}</p>
              )}
            </CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
