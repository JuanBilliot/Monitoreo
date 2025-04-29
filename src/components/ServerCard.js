import React from 'react';
import { Card, Text, Group, Badge, ActionIcon, Progress, Stack } from '@mantine/core';
import { IconTrash, IconServer, IconCpu, IconDatabase } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

function ServerCard({ server, onDelete }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={() => navigate(`/server/${server.id}`)}
      style={{ 
        cursor: 'pointer',
        backgroundColor: '#112240',
        border: '1px solid rgba(100, 255, 218, 0.1)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-5px)',
          borderColor: '#64FFDA',
        }
      }}
    >
      <Card.Section p="md" style={{ borderBottom: '1px solid rgba(100, 255, 218, 0.1)' }}>
        <Group justify="space-between" align="center">
          <Group>
            <IconServer size={24} color="#64FFDA" />
            <Text fw={500} size="lg" c="#E6F1FF">
              {server.name}
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(server.id);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Card.Section>

      <Stack mt="md" spacing="sm">
        <Text size="sm" c="#8892B0">
          IP: <Text span c="#E6F1FF">{server.ip_address}</Text>
        </Text>
        
        <Group justify="space-between" align="center">
          <Text size="sm" c="#8892B0">Tipo:</Text>
          <Badge
            variant="light"
            color="cyan"
            style={{
              backgroundColor: 'rgba(100, 255, 218, 0.1)',
              color: '#64FFDA',
            }}
          >
            {server.type}
          </Badge>
        </Group>

        <Group justify="space-between" align="center">
          <Text size="sm" c="#8892B0">Estado:</Text>
          <Badge
            variant="light"
            color={getStatusColor(server.status)}
          >
            {server.status.toUpperCase()}
          </Badge>
        </Group>

        <Stack spacing="xs">
          <Group justify="space-between" align="center">
            <Group spacing="xs">
              <IconCpu size={16} color="#64FFDA" />
              <Text size="sm" c="#8892B0">CPU:</Text>
            </Group>
            <Text size="sm" c="#E6F1FF">{server.cpu_usage}%</Text>
          </Group>
          <Progress 
            value={server.cpu_usage} 
            size="sm" 
            color={server.cpu_usage > 80 ? 'red' : server.cpu_usage > 60 ? 'yellow' : 'cyan'}
          />
        </Stack>

        <Stack spacing="xs">
          <Group justify="space-between" align="center">
            <Group spacing="xs">
              <IconDatabase size={16} color="#64FFDA" />
              <Text size="sm" c="#8892B0">Memoria:</Text>
            </Group>
            <Text size="sm" c="#E6F1FF">{server.memory_usage}%</Text>
          </Group>
          <Progress 
            value={server.memory_usage} 
            size="sm"
            color={server.memory_usage > 80 ? 'red' : server.memory_usage > 60 ? 'yellow' : 'cyan'}
          />
        </Stack>
      </Stack>
    </Card>
  );
}

export default ServerCard;
