import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Spinner,
  Alert,
  List,
  ListItem,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  Badge
} from '@patternfly/react-core';
import { ChartDonut, ChartThemeColor } from '@patternfly/react-charts/victory';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { BellIcon } from '@patternfly/react-icons';
import { fetchUcpSystems, fetchComputeDevices, fetchFirmwareCompliance, fetchActiveTasks, fetchRecentAlerts } from './api';
import UserDropdown from './components/UserDropdown';
import './styles.css'; // Ensure styles are applied
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { icon } from 'leaflet';
// Import marker images
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import AlertsDropdown from './components/AlertsDropdown';


// ✅ Define TypeScript interfaces
interface GeoInformation {
  latitude?: string;
  longitude?: string;
  country?: string;
  zipcode?: string;
}

interface ComputeDevice {
  resourceId: string;
  serverLabel?: string;
  network?: { hostName?: string };
  bmcAddress?: string;
}

interface UcpSystem {
  resourceId: string;
  name: string;
  region?: string;
  computeDevices?: ComputeDevice[];
  geoInformation?: GeoInformation;
}

interface Alert {
  device: string;
  alert: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  startTime: string;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ Custom marker for map
const customMarkerIcon = icon({
  iconUrl: markerIcon,  // ✅ Correct way to import icon
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Dashboard() {
  // ✅ Explicitly define state types
  const navigate = useNavigate();
  const [systems, setSystems] = useState<UcpSystem[]>([]);
  const [computeDevices, setComputeDevices] = useState<ComputeDevice[]>([]);
  const [firmwareCompliance, setFirmwareCompliance] = useState<{ total: number; compliant: number; nonCompliant: number }>({
    total: 0,
    compliant: 0,
    nonCompliant: 0
  });
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [systemsResponse, devicesResponse, firmwareResponse, tasksResponse, alertsResponse] = await Promise.all([
        fetchUcpSystems(),
        fetchComputeDevices(),
        fetchFirmwareCompliance(),
        fetchActiveTasks(),
        fetchRecentAlerts()
      ]);

      setSystems(systemsResponse.data || []);
      setComputeDevices(devicesResponse.data || []);
      setFirmwareCompliance(firmwareResponse.data || { total: 0, compliant: 0, nonCompliant: 0 });
      setActiveTasks(tasksResponse.data || []);
      setRecentAlerts(alertsResponse.data.map(alert => ({
        device: alert.device.serverLabel || alert.device.resourceId,
        alert: alert.alert
      })));
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      {/* Top Navigation Bar */}
      <Toolbar className="dashboard-toolbar">
        <ToolbarGroup>
          <ToolbarItem>
            <AlertsDropdown alerts={recentAlerts} />
          </ToolbarItem>
          <ToolbarItem>
            <UserDropdown />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>

      {loading && <Spinner />}
      {error && <Alert variant="danger" title={error} />}

      <Grid hasGutter>
        {/* Total Systems & Compute Devices */}
        <GridItem span={3}>
          <Card isCompact>
            <CardBody>
              <CardTitle>Total UCP Systems</CardTitle>
              <div className="large-metric">{systems.length}</div>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact>
            <CardBody>
              <CardTitle>Total Compute Devices</CardTitle>
              <div className="large-metric">{computeDevices.length}</div>
            </CardBody>
          </Card>
        </GridItem>

        {/* Firmware Compliance & Map Side by Side */}
        <GridItem span={6}>
          <Card className="firmware-compliance">
            <CardBody>
              <CardTitle>Firmware Compliance</CardTitle>
              {firmwareCompliance.total > 0 ? (
                <ChartDonut
                  data={[
                    { x: 'Compliant', y: firmwareCompliance.compliant },
                    { x: 'Non-Compliant', y: firmwareCompliance.nonCompliant }
                  ]}
                  labels={({ datum }) => `${datum.x}: ${datum.y}`}
                  title={`${firmwareCompliance.compliant} / ${firmwareCompliance.total}`}
                  subTitle="Compliant Devices"
                  themeColor={ChartThemeColor.green}
                  height={150}
                  width={300}
                />
              ) : (
                <Spinner />
              )}
            </CardBody>
          </Card>
        </GridItem>

        <GridItem span={6}>
          <Card className="map-container">
            <CardBody>
              <CardTitle>UCP System Locations</CardTitle>
              <MapContainer center={[20, 0]} zoom={2} minZoom={2} maxZoom={10} style={{ height: '300px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MarkerClusterGroup>
                  {systems.map(system => (
                    <Marker
                      key={system.resourceId}
                      position={
                        system.geoInformation?.latitude && system.geoInformation?.longitude
                          ? [parseFloat(system.geoInformation.latitude), parseFloat(system.geoInformation.longitude)]
                          : [0, 0] // Default position if data is missing
                      }
                    >
                      <Popup>
                        <strong>{system.name}</strong>
                        <p>{system.region || 'Unknown Region'}</p>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            </CardBody>
          </Card>
        </GridItem>

        {/* Fixed-height Active Tasks & Alerts */}
        <GridItem span={6}>
          <Card className="fixed-height-card">
            <CardBody>
              <CardTitle>Active Tasks</CardTitle>
              <div className="scrollable-content">
                {activeTasks.length > 0 ? (
                  <List>
                    {activeTasks.map(task => (
                      <ListItem key={task.id}>
                        {task.name} - {task.status} (Started: {new Date(task.startTime).toLocaleString()})
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <p>No active tasks.</p>
                )}
              </div>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </>
  );
}
