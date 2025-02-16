import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, Grid, GridItem, Spinner, Alert, Label, Button } from '@patternfly/react-core';
import { ServerIcon } from '@patternfly/react-icons';
import './styles.css';
import { fetchUcpSystems, setComputePowerState, ComputeDevice, UcpSystem } from './api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngExpression, icon } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { logout } from './api'; // Import the logout function


const customMarkerIcon = icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41]
});



function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'normal': return 'green';
    case 'warning': return 'orange';
    case 'critical': return 'red';
    default: return 'blue';
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [infrastructureData, setInfrastructureData] = useState<UcpSystem[]>([]);
  const [computeDevices, setComputeDevices] = useState<ComputeDevice[]>([]);
  const [error, setError] = useState('');
  const [hoveredSystem, setHoveredSystem] = useState<UcpSystem | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect user to login page
  };
  const loadData = useCallback(async () => {
    try {
      const response = await fetchUcpSystems();
  
      console.log("API Response:", response); // ✅ Debugging log
  
      if (response.error) {
        setError(response.error);
      } else {
        const data = response.data || [];
        
        if (!Array.isArray(data)) {
          console.error("❌ Expected an array but received:", data);
          throw new Error("Invalid API response: Expected an array.");
        }
  
        setInfrastructureData(data);
      }
    } catch (err) {
      console.error("❌ Error in loadData:", err);
      setError("Failed to load data.");
    }
  }, []);
  

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchUcpSystems();
        if (response.error) {
          setError(response.error);
        } else {
          setInfrastructureData(response.data || []);
        }
      } catch (err) {
        setError('Failed to load data.');
      }
    }
  
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
 
  const handleCardClick = (device: ComputeDevice) => {
    const system = infrastructureData.find(sys => 
      sys.computeDevices?.some((d: ComputeDevice) => d.resourceId === device.resourceId)
    );
    if (system) {
      navigate(`/systems/${system.resourceId}`);
    }
  };

  return (
    <>
      <Grid hasGutter style={{ marginBottom: '1rem' }}>
        {/* Logout Button */}
        <GridItem span={12} style={{ textAlign: 'right', marginTop: '1rem' }}>
          <Button variant="danger" onClick={handleLogout}>Logout</Button>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact className="metric-card">
            <CardBody>
              <CardTitle>Total Systems</CardTitle>
              <div className="pf-u-font-size-2xl metric-value">{infrastructureData.length}</div>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact className="metric-card">
            <CardBody>
              <CardTitle>Compute Devices</CardTitle>
              <div className="pf-u-font-size-2xl metric-value">{computeDevices.length}</div>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact className="metric-card">
            <CardBody>
              <CardTitle>Total CPUs</CardTitle>
              <div className="pf-u-font-size-2xl metric-value">
                {computeDevices.reduce((sum, device) => sum + (device.cpus || 0), 0)}
              </div>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={3}>
          <Card isCompact className="metric-card">
            <CardBody>
              <CardTitle>Total Memory</CardTitle>
              <div className="pf-u-font-size-2xl metric-value">
                {Math.round(computeDevices.reduce((sum, device) => sum + (device.totalMemoryInMb || 0), 0) / 1024)} GB
              </div>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
      
      <MapContainer center={[20, 0] as LatLngExpression} zoom={2} style={{ height: '400px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkerClusterGroup>
        {Array.isArray(infrastructureData) && infrastructureData.map(system => {
          const lat = system.geoInformation?.latitude ? parseFloat(system.geoInformation.latitude) : 0;
          const lon = system.geoInformation?.longitude ? parseFloat(system.geoInformation.longitude) : 0;
          return (
            <Marker 
              key={system.resourceId} 
              position={[lat, lon] as LatLngExpression} 
              icon={customMarkerIcon}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>{system.name || 'Unknown System'}</h3>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <Label color={getStatusVariant(system.resourceState || '')}>{system.resourceState || 'Unknown'}</Label>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <p style={{ margin: 0 }}><strong>Model:</strong> {system.model || 'Unknown'}</p>
                    <p style={{ margin: 0 }}><strong>Region:</strong> {system.region || 'Unknown'}</p>
                    {system.computeDevices?.length > 0 && (
                      <p style={{ margin: 0 }}><strong>Compute Devices:</strong> {system.computeDevices.length}</p>
                    )}
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => navigate(`/systems/${system.resourceId}`)}
                    style={{ marginTop: '8px', width: '100%' }}
                  >
                    View Details
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
      })}
        </MarkerClusterGroup>
      </MapContainer>

      {hoveredSystem && (
        <div className="hover-card-container" style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
          <Card isCompact className="hover-card">
            <CardBody>
              <CardTitle style={{ cursor: 'pointer' }} onClick={() => navigate(`/systems/${hoveredSystem.resourceId}`)}>
                {hoveredSystem.name || 'Unknown'} - {hoveredSystem.model || 'Unknown'}
              </CardTitle>
              <Label color={getStatusVariant(hoveredSystem.resourceState || '')}>{hoveredSystem.resourceState || 'Unknown'}</Label>
              {(hoveredSystem.computeDevices || []).length > 0 && <p>Compute Devices: {hoveredSystem.computeDevices.length}</p>}
              {(hoveredSystem.storageDevices || []).length > 0 && <p>Storage Devices: {hoveredSystem.storageDevices.length}</p>}
              {(hoveredSystem.ethernetSwitches || []).length > 0 && <p>Network Switches: {hoveredSystem.ethernetSwitches.length}</p>}
              {(hoveredSystem.fibreChannelSwitches || []).length > 0 && <p>FC Switches: {hoveredSystem.fibreChannelSwitches.length}</p>}
            </CardBody>
          </Card>
        </div>
      )}

      <Grid hasGutter>
        {error && <Alert variant="danger" title={error} />}
        {computeDevices.length > 0 ? (
          computeDevices.map(device => (
            <GridItem span={4} key={device.resourceId}>
              <Card onClick={() => handleCardClick(device)} isClickable className="hover-card">
                <CardBody className="pf-u-text-align-center">
                  <ServerIcon size={32} className="pf-u-mb-md" />
                  <CardTitle>{device.model}</CardTitle>
                  <Label color={getStatusVariant(device.resourceState || '')}>{device.resourceState || 'Unknown'}</Label>
                  <Label 
                    color={(device.powerStatus || '').toLowerCase() === 'on' ? 'green' : 'red'}
                    className="pf-u-ml-sm"
                  >
                    {device.powerStatus || 'Unknown'}
                  </Label>
                  <p><strong>Serial:</strong> {device.serialNumber}</p>
                  <p><strong>CPUs:</strong> {device.cpus}</p>
                  <p><strong>Memory:</strong> {Math.round(device.totalMemoryInMb / 1024)} GB</p>
                  {device.gpus > 0 && <p><strong>GPUs:</strong> {device.gpus}</p>}
                </CardBody>
              </Card>
            </GridItem>
          ))
        ) : (
          <Spinner />
        )}
      </Grid>
    </>
  );
}
