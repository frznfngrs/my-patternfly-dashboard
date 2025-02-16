import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, Grid, GridItem, Spinner, Alert, Button, List, ListItem } from '@patternfly/react-core';
import { ChartDonut, ChartThemeColor } from '@patternfly/react-charts/victory';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { LatLngExpression, icon } from 'leaflet';
import { fetchUcpSystems, fetchComputeDevices, fetchFirmwareCompliance, fetchActiveTasks, fetchRecentAlerts, logout } from './api';

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

// ✅ Custom marker for map
const customMarkerIcon = icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41]
});

export default function Dashboard() {
  const navigate = useNavigate();

  // ✅ Explicitly define state types
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
  
      console.log("🟢 API Response - Systems:", systemsResponse);
      console.log("🟢 API Response - Devices:", devicesResponse);
      console.log("🟢 API Response - Firmware Compliance:", firmwareResponse);
      console.log("🟢 API Response - Tasks:", tasksResponse);
      console.log("🟢 API Response - Alerts:", alertsResponse);
  
      if (!Array.isArray(systemsResponse.data)) {
        throw new Error("Invalid API response: Expected an array but received something else");
      }
  
      if (!Array.isArray(devicesResponse.data)) {
        throw new Error("Invalid API response: Expected an array but received something else");
      }
  
      setSystems(systemsResponse.data || []);
      setComputeDevices(devicesResponse.data || []);
      setFirmwareCompliance(firmwareResponse.data || { total: 0, compliant: 0, nonCompliant: 0 });
      setActiveTasks(tasksResponse.data || []);
      const formattedAlerts = alertsResponse.data.map((alert: { device: ComputeDevice; alert: string }) => ({
        device: alert.device.serverLabel || alert.device.network?.hostName || alert.device.resourceId,
        alert: alert.alert
      }));
      
      setRecentAlerts(formattedAlerts);
      
    } catch (err: any) {
      console.error("❌ Error loading dashboard data:", err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <Grid hasGutter>
        {/* Logout Button */}
        <GridItem span={12} style={{ textAlign: 'right' }}>
          <Button variant="danger" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </Button>
        </GridItem>

        {/* Total Systems & Compute Devices */}
        <GridItem span={3}>
          <Card isCompact>
            <CardBody>
              <CardTitle>Total UCP Systems</CardTitle>
              <div className="pf-u-font-size-lg">{systems.length}</div>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact>
            <CardBody>
              <CardTitle>Total Compute Devices</CardTitle>
              <div className="pf-u-font-size-lg">{computeDevices.length}</div>
            </CardBody>
          </Card>
        </GridItem>

        {/* Firmware Compliance */}
        <GridItem span={6}>
          <Card isCompact>
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
      </Grid>

      {/* Recent Alerts Panel */}
      <Grid hasGutter>
        <GridItem span={6}>
          <Card>
            <CardBody>
              <CardTitle>Recent Alerts (Last 24h)</CardTitle>
              {recentAlerts.length > 0 ? (
                <List>
                  {recentAlerts.map((alert, index) => (
                    <ListItem key={index}>
                      {alert.device} - {alert.alert}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <p>No recent alerts.</p>
              )}
            </CardBody>
          </Card>
        </GridItem>

        {/* Active Tasks */}
        <GridItem span={6}>
          <Card>
            <CardBody>
              <CardTitle>Active Tasks</CardTitle>
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
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Map */}
      <Grid hasGutter>
        <GridItem span={12}>
          <Card>
            <CardBody>
              <CardTitle>UCP System Locations</CardTitle>
              <MapContainer
                  center={[20, 0]}
                  zoom={2}
                  minZoom={2}   // Prevent zooming out too far
                  maxZoom={10}  // Limit excessive zoom
                  style={{ height: '400px', width: '50%' }} // Adjust width to half
                  preferCanvas={true} // Fix white tiles
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MarkerClusterGroup>
                    {systems.map((system) => {
                    const lat = parseFloat(system.geoInformation?.latitude || "0");
                    const lon = parseFloat(system.geoInformation?.longitude || "0");
                      return (
                        <Marker key={system.resourceId} position={[lat, lon]} icon={customMarkerIcon}>
                          <Popup>
                            <h3>{system.name || 'Unknown System'}</h3>
                            <p><strong>Region:</strong> {system.region || 'Unknown'}</p>
                            <p><strong>Compute Devices:</strong> {system.computeDevices?.length || 0}</p>
                            <Button variant="primary" onClick={() => navigate(`/systems/${system.resourceId}`)}>View Details</Button>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>
                </MapContainer>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {loading && <Spinner />}
      {error && <Alert variant="danger" title={error} />}
    </>
  );
}
