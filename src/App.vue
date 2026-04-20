<script setup>
import Calendar from './components/Calendar.vue'

const today = new Date()

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const resources = [
  { xid: 1, name: 'Omar Sanchez Lozada', color: '#22c55e' },
  { xid: 2, name: 'Pedro Juarez Gonzales', color: '#0ea5e9' },
  { xid: 3, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 4, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 5, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 6, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 7, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 8, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 9, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 10, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 11, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 12, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 13, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 14, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 15, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 16, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 17, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 18, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 19, name: 'Juan Perez Hernandez', color: '#f59e0b' },
  // { xid: 20, name: 'Juan Perez Hernandez', color: '#f59e0b' },
]

const events = [
  {
    id: 1001,
    type: 'appointment',
    title: 'Routine Checkup - Julia R.',
    resource_id: 1,
    appointment_date: formatDate(today),
    start_time: '09:00 AM',
    end_time: '09:30 AM',
    status: 'registered',
  },
  {
    id: 1002,
    type: 'appointment',
    title: 'Root Canal - Kevin M.',
    resource_id: 2,
    appointment_date: formatDate(today),
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    status: 'in_progress',
  },
  {
    id: 1003,
    type: 'task',
    title: 'Follow-up calls',
    resource_id: 3,
    appointment_date: formatDate(today),
    start_time: '01:00 PM',
    end_time: '01:30 PM',
    is_completed: false,
    status: 'scheduled',
  },
  {
    id: 1006,
    type: 'event',
    title: 'Team Standup',
    participant_name: 'Front Desk + Ops',
    resource_id: 1,
    appointment_date: formatDate(today),
    start_time: '08:30 AM',
    end_time: '09:00 AM',
    color: '#22c55e',
    status: 'scheduled',
  },
  {
    id: 1007,
    type: 'event',
    title: 'Vendor Training Session',
    resource_id: 2,
    appointment_date: formatDate(today),
    start_time: '02:30 PM',
    end_time: '03:30 PM',
    color: '#0ea5e9',
    status: 'scheduled',
  },
  {
    id: 1008,
    type: 'event',
    title: 'Quarterly Review',
    resource_id: 3,
    appointment_date: formatDate(addDays(today, 1)),
    start_time: '09:00 AM',
    end_time: '10:30 AM',
    color: '#7c3aed',
    status: 'scheduled',
  },
  {
    id: 1009,
    type: 'event',
    title: 'Office Closure',
    resource_id: 1,
    appointment_date: formatDate(addDays(today, 2)),
    start_time: '12:00 AM',
    end_time: '11:59 PM',
    color: '#ef4444',
    is_all_day: true,
    status: 'scheduled',
  },
  {
    id: 1004,
    type: 'appointment',
    title: 'Whitening - Amy T.',
    resource_id: 1,
    appointment_date: formatDate(addDays(today, 1)),
    start_time: '11:30 AM',
    end_time: '12:15 PM',
    status: 'scheduled',
  },
  {
    id: 1005,
    type: 'appointment',
    title: 'Implant Consult - Noah D.',
    resource_id: 2,
    appointment_date: formatDate(addDays(today, 2)),
    start_time: '03:00 PM',
    end_time: '03:45 PM',
    status: 'scheduled',
  },
]

const selectedResources = [1, 2, 3]
</script>

<template>
  <Calendar
    :events="events"
    :resources="resources"
    :modelValueDate="formatDate(today)"
  />
</template>
