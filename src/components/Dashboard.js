import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppShell,
  Button,
  Group,
  Box,
  Title,
  Stack,
  ActionIcon,
  Menu,
} from '@mantine/core';
import {
  IconServer,
  IconPlus,
  IconLogout,
  IconUser,
  IconSettings,
  IconDashboard,
} from '@tabler/icons-react';
import ServerCard from './ServerCard';
import AddServerModal from './AddServerModal';
import '../styles/animations.css';

function Dashboard() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [servers, setServers] = useState([
    {
      id: 1,
      name: 'Servidor Principal',
      ip_address: '192.168.1.100',
      status: 'active',
      type: 'Production',
      cpu_usage: 45,
      memory_usage: 60,
    },
    {
      id: 2,
      name: 'Servidor Desarrollo',
      ip_address: '192.168.1.101',
      status: 'warning',
      type: 'Development',
      cpu_usage: 75,
      memory_usage: 80,
    },
  ]);

  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleAddServer = (newServer) => {
    setServers([...servers, { ...newServer, id: servers.length + 1 }]);
    setOpened(false);
  };

  const handleDeleteServer = (id) => {
    setServers(servers.filter(server => server.id !== id));
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header style={{ backgroundColor: '#0A192F', borderBottom: '1px solid rgba(100, 255, 218, 0.1)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <div className="logo-icon">
              <IconServer size={30} color="#64FFDA" />
            </div>
            <Title order={3} c="#E6F1FF">NetFlow</Title>
          </Group>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconUser size={20} color="#64FFDA" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown style={{ backgroundColor: '#112240', border: '1px solid rgba(100, 255, 218, 0.1)' }}>
              <Menu.Label c="#8892B0">Usuario</Menu.Label>
              <Menu.Item
                leftSection={<IconUser size={14} color="#64FFDA" />}
                c="#E6F1FF"
              >
                {user?.username || 'Usuario'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
                c="#E6F1FF"
              >
                Cerrar Sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ backgroundColor: '#0A192F', borderRight: '1px solid rgba(100, 255, 218, 0.1)' }}>
        <Stack>
          <Button
            leftSection={<IconDashboard size={20} />}
            variant="subtle"
            color="cyan"
            fullWidth
            styles={{
              root: {
                color: '#64FFDA',
                '&:hover': {
                  backgroundColor: 'rgba(100, 255, 218, 0.1)',
                }
              }
            }}
          >
            Dashboard
          </Button>
          <Button
            leftSection={<IconSettings size={20} />}
            variant="subtle"
            color="cyan"
            fullWidth
            styles={{
              root: {
                color: '#64FFDA',
                '&:hover': {
                  backgroundColor: 'rgba(100, 255, 218, 0.1)',
                }
              }
            }}
          >
            Configuración
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: '#0A192F' }}>
        <Box p="md">
          <Group justify="space-between" mb="lg">
            <Title order={2} c="#E6F1FF">Servidores</Title>
            <Button
              onClick={() => setOpened(true)}
              leftSection={<IconPlus size={20} />}
              styles={{
                root: {
                  backgroundColor: '#64FFDA',
                  color: '#0A192F',
                  '&:hover': {
                    backgroundColor: 'rgba(100, 255, 218, 0.8)',
                  }
                }
              }}
            >
              Agregar Servidor
            </Button>
          </Group>

          <Box
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onDelete={handleDeleteServer}
              />
            ))}
          </Box>
        </Box>
      </AppShell.Main>

      <AddServerModal
        opened={opened}
        onClose={() => setOpened(false)}
        onAdd={handleAddServer}
      />
    </AppShell>
  );
}

export default Dashboard;
