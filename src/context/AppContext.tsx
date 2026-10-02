import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SubDepartmentId,
  UserProfile,
  AccessRequest,
  NeedsAttentionItem,
  AuditLogItem,
  FinanceTransaction,
  CameraItem,
  WiFiAccessPoint,
  WalkieDevice,
  ControlRoom,
  InventoryItem,
  PurchaseRequest,
  AccommodationRoom,
  AccommodationBed,
  Sewadar,
  AppNotification,
} from '../types';

// Pre-defined personas to easily switch roles and demonstrate strict RBAC & isolation
export const PRESET_USERS: UserProfile[] = [
  {
    id: 'user-owner',
    name: 'Harminder Singh Dhillon',
    email: 'harminder.it@eventcommand.org',
    phone: '+91 98765 43210',
    role: 'owner',
    designation: 'Chief Information Officer (IT Owner)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    badgeId: 'CMD-001',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export', 'manage_users'],
    status: 'active',
    lastActive: 'Just now',
  },
  {
    id: 'user-cctv-head',
    name: 'Gurmeet Singh Virk',
    email: 'gurmeet.cctv@eventcommand.org',
    phone: '+91 98111 22334',
    role: 'sub_dept_head',
    subDepartmentId: 'cctv',
    departmentName: 'CCTV Surveillance & Optics',
    designation: 'Head of CCTV Surveillance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    badgeId: 'CCTV-H01',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    status: 'active',
    lastActive: '5 mins ago',
  },
  {
    id: 'user-cctv-tech',
    name: 'Jaspreet Kaur Gill',
    email: 'jaspreet.tech@eventcommand.org',
    phone: '+91 98222 33445',
    role: 'staff',
    subDepartmentId: 'cctv',
    departmentName: 'CCTV Surveillance & Optics',
    designation: 'CCTV Field Technician',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    badgeId: 'CCTV-T09',
    permissions: ['view', 'create', 'edit'],
    status: 'active',
    lastActive: '12 mins ago',
  },
  {
    id: 'user-walkie-head',
    name: 'Arvinder Singh Bindra',
    email: 'arvinder.walkie@eventcommand.org',
    phone: '+91 98333 44556',
    role: 'sub_dept_head',
    subDepartmentId: 'walkie',
    departmentName: 'RF & Radio Comms',
    designation: 'Head of Walkie-Talkie Fleet',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    badgeId: 'WALK-H01',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    status: 'active',
    lastActive: '1 min ago',
  },
  {
    id: 'user-wifi-head',
    name: 'Harpreet Singh Sandhu',
    email: 'harpreet.wifi@eventcommand.org',
    phone: '+91 98444 55667',
    role: 'sub_dept_head',
    subDepartmentId: 'wifi',
    departmentName: 'Network & Fiber Infrastructure',
    designation: 'Principal Network Architect',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    badgeId: 'WIFI-H01',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    status: 'active',
    lastActive: '18 mins ago',
  },
  {
    id: 'user-inventory-head',
    name: 'Simranjeet Singh Sodhi',
    email: 'simran.inventory@eventcommand.org',
    phone: '+91 98555 66778',
    role: 'sub_dept_head',
    subDepartmentId: 'inventory',
    departmentName: 'IT Central Warehouses',
    designation: 'Head of IT Inventory & Warehousing',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    badgeId: 'INV-H01',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    status: 'active',
    lastActive: '30 mins ago',
  },
  {
    id: 'user-sewadar-lead',
    name: 'Taranjit Singh Chawla',
    email: 'taranjit.sewadars@eventcommand.org',
    phone: '+91 98666 77889',
    role: 'sub_dept_head',
    subDepartmentId: 'sewadars',
    departmentName: 'IT Sewadar Manpower Bureau',
    designation: 'Director of IT Sewadars & Volunteers',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80',
    badgeId: 'SEWA-H01',
    permissions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    status: 'active',
    lastActive: '3 mins ago',
  },
  {
    id: 'user-new-volunteer',
    name: 'Amandeep Kaur Bhatia',
    email: 'amandeep.volunteer@eventcommand.org',
    phone: '+91 98777 88990',
    role: 'volunteer',
    designation: 'Unassigned Volunteer (Pending Onboarding)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    badgeId: 'VOL-994',
    permissions: ['view'],
    status: 'pending',
    lastActive: 'Just logged in',
  },
];

// Initial Cameras Seed
const INITIAL_CAMERAS: CameraItem[] = [
  { id: 'c-1', cameraCode: 'CAM-Z1-001', name: 'Main Diwan Hall North Gate 1', zone: 'Sector A - Main Diwan', locationDetails: 'Truss Pole A4, North Gate Entry', type: 'PTZ 4K', ipAddress: '10.10.1.11', controlRoomId: 'CR-MAIN', status: 'online', lastPing: '2s ago', uptimePercent: 99.9, storageDays: 30 },
  { id: 'c-2', cameraCode: 'CAM-Z1-002', name: 'Main Diwan Stage Center High', zone: 'Sector A - Main Diwan', locationDetails: 'Front of House Stage Grid #2', type: 'Dome 360', ipAddress: '10.10.1.12', controlRoomId: 'CR-MAIN', status: 'online', lastPing: '1s ago', uptimePercent: 100.0, storageDays: 30 },
  { id: 'c-3', cameraCode: 'CAM-Z2-014', name: 'Langar Hall Cooking Kitchen Line 1', zone: 'Sector B - Mega Langar', locationDetails: 'Khadur Sahib Kitchen Shed 2', type: 'Fixed Bullet', ipAddress: '10.10.2.14', controlRoomId: 'CR-LANG', status: 'online', lastPing: '4s ago', uptimePercent: 99.8, storageDays: 30 },
  { id: 'c-4', cameraCode: 'CAM-Z4-089', name: 'Zone 4 Outer Ring Gate 3 (Power Loss)', zone: 'Sector D - Perimeter Gates', locationDetails: 'Outer Perimeter Post 18', type: 'Thermal Perimeter', ipAddress: '10.10.4.89', controlRoomId: 'CR-SEC', status: 'offline', lastPing: '18m ago', uptimePercent: 94.2, storageDays: 30 },
  { id: 'c-5', cameraCode: 'CAM-Z3-042', name: 'West Parking Lot 4 - Bus Transit Bay', zone: 'Sector C - Parking Lots', locationDetails: 'High Mast Tower 3 West', type: 'PTZ 4K', ipAddress: '10.10.3.42', controlRoomId: 'CR-TRAF', status: 'online', lastPing: '3s ago', uptimePercent: 99.5, storageDays: 30 },
  { id: 'c-6', cameraCode: 'CAM-Z5-010', name: 'Medical ICU Tent Entry & Ambulance Bay', zone: 'Sector E - Medical & Emergency', locationDetails: 'Emergency Hub Bay 1', type: 'Dome 360', ipAddress: '10.10.5.10', controlRoomId: 'CR-MED', status: 'online', lastPing: '1s ago', uptimePercent: 100.0, storageDays: 30 },
  { id: 'c-7', cameraCode: 'CAM-Z6-033', name: 'IT Server Room Container Alpha', zone: 'Sector F - Central IT Hub', locationDetails: 'Rack Row 1 Dual Lens Security', type: 'Fixed Bullet', ipAddress: '10.10.6.33', controlRoomId: 'CR-MAIN', status: 'online', lastPing: '1s ago', uptimePercent: 100.0, storageDays: 30 },
  { id: 'c-8', cameraCode: 'CAM-Z2-055', name: 'Langar Hall Distribution Bay 4', zone: 'Sector B - Mega Langar', locationDetails: 'Pangat Hall 4 Overhead beam', type: 'Fixed Bullet', ipAddress: '10.10.2.55', controlRoomId: 'CR-LANG', status: 'maintenance', lastPing: '1h ago', uptimePercent: 96.0, storageDays: 30 },
];

// Initial WiFi Access Points
const INITIAL_APS: WiFiAccessPoint[] = [
  { id: 'ap-1', apCode: 'AP-DIWAN-01', model: 'Cisco Catalyst 9130AX', zone: 'Sector A - Main Diwan', location: 'Ceiling Truss Grid 1', ipAddress: '172.16.10.11', macAddress: '70:69:79:3A:8B:11', connectedClients: 342, bandwidthUsageMbps: 480, status: 'online', switchPort: 'SW-CORE-01/Gi1/0/1', uptimeHours: 142 },
  { id: 'ap-2', apCode: 'AP-DIWAN-02', model: 'Cisco Catalyst 9130AX', zone: 'Sector A - Main Diwan', location: 'Ceiling Truss Grid 2', ipAddress: '172.16.10.12', macAddress: '70:69:79:3A:8B:12', connectedClients: 398, bandwidthUsageMbps: 540, status: 'online', switchPort: 'SW-CORE-01/Gi1/0/2', uptimeHours: 142 },
  { id: 'ap-3', apCode: 'AP-LANGAR-04', model: 'Aruba AP-555 WiFi 6', zone: 'Sector B - Mega Langar', location: 'Pangat Hall 2 Center Column', ipAddress: '172.16.20.14', macAddress: '00:0B:86:E4:9C:04', connectedClients: 289, bandwidthUsageMbps: 210, status: 'high_latency', switchPort: 'SW-DIST-03/Gi0/14', uptimeHours: 89 },
  { id: 'ap-4', apCode: 'AP-VIP-PAV-01', model: 'Ruckus R750 Enterprise', zone: 'Sector G - VIP Pavilion', location: 'VIP Secretariat Hall East', ipAddress: '172.16.70.10', macAddress: 'D8:38:FC:12:33:99', connectedClients: 64, bandwidthUsageMbps: 180, status: 'online', switchPort: 'SW-VIP-01/Gi1/0/1', uptimeHours: 190 },
  { id: 'ap-5', apCode: 'AP-PARK-08', model: 'Aruba AP-575 Outdoor Rugged', zone: 'Sector C - West Parking', location: 'Light Pole 12 South Bay', ipAddress: '172.16.30.28', macAddress: '00:0B:86:F1:11:88', connectedClients: 110, bandwidthUsageMbps: 95, status: 'offline', switchPort: 'SW-OUT-02/Gi0/8', uptimeHours: 0 },
  { id: 'ap-6', apCode: 'AP-IT-CMD-01', model: 'Cisco Catalyst 9130AX', zone: 'Sector F - Central IT Hub', location: 'IT Main Command Operations Floor', ipAddress: '172.16.60.01', macAddress: '70:69:79:3A:99:01', connectedClients: 88, bandwidthUsageMbps: 620, status: 'online', switchPort: 'SW-CORE-02/Gi1/0/1', uptimeHours: 210 },
];

// Initial Walkie-Talkies
const INITIAL_WALKIES: WalkieDevice[] = [
  { id: 'w-1', serialNumber: 'MOT-XIR-8821', model: 'Motorola XiR P8668i (DMR/GPS)', channelSet: 'CH-01: Traffic & Transit', assignedDept: 'Traffic & Parking Control', assignedToName: 'Baldev Singh (In-charge Gate 4)', assignedToPhone: '+91 98888 12345', status: 'active', batteryHealth: 98, dispatchedAt: 'Today 06:15 AM', dueAt: 'Today 10:00 PM' },
  { id: 'w-2', serialNumber: 'MOT-XIR-8822', model: 'Motorola XiR P8668i (DMR/GPS)', channelSet: 'CH-02: Security Command', assignedDept: 'Security & Rapid Response', assignedToName: 'Sukhwinder Singh', assignedToPhone: '+91 98888 23456', status: 'active', batteryHealth: 94, dispatchedAt: 'Today 06:20 AM', dueAt: 'Today 10:00 PM' },
  { id: 'w-3', serialNumber: 'MOT-XIR-8823', model: 'Motorola XiR P8668i (DMR/GPS)', channelSet: 'CH-03: Mega Langar Supply', assignedDept: 'Langar Management', assignedToName: 'Gurtej Singh', assignedToPhone: '+91 98888 34567', status: 'active', batteryHealth: 91, dispatchedAt: 'Today 07:00 AM', dueAt: 'Tomorrow 07:00 AM' },
  { id: 'w-4', serialNumber: 'MOT-XIR-8940', model: 'Motorola XiR P8668i (DMR/GPS)', channelSet: 'CH-04: Emergency Medical', assignedDept: 'Medical & Ambulance', assignedToName: 'Dr. Navneet Kaur', assignedToPhone: '+91 98888 45678', status: 'active', batteryHealth: 99, dispatchedAt: 'Today 08:00 AM', dueAt: 'Today 08:00 PM' },
  { id: 'w-5', serialNumber: 'MOT-XIR-9011', model: 'Motorola XiR P6620i', channelSet: 'CH-05: IT Field Response', assignedDept: 'Unassigned Batch 12', status: 'in_storage', batteryHealth: 100 },
  { id: 'w-6', serialNumber: 'MOT-XIR-9012', model: 'Motorola XiR P6620i', channelSet: 'CH-05: IT Field Response', assignedDept: 'Unassigned Batch 12', status: 'in_storage', batteryHealth: 97 },
  { id: 'w-7', serialNumber: 'MOT-XIR-7701', model: 'Motorola GP328 Plus', channelSet: 'CH-06: Sanitation & Water', assignedDept: 'Sanitation Dept', assignedToName: 'Karamjit Singh', status: 'overdue', batteryHealth: 68, dispatchedAt: 'Yesterday 07:00 AM', dueAt: 'Yesterday 08:00 PM' },
  { id: 'w-8', serialNumber: 'MOT-XIR-7705', model: 'Motorola XiR P8668i', channelSet: 'CH-02: Security Command', assignedDept: 'Security Dept', status: 'maintenance', batteryHealth: 42 },
];

// Initial Control Rooms
const INITIAL_CONTROL_ROOMS: ControlRoom[] = [
  { id: 'CR-MAIN', code: 'CR-01', name: 'Central IT Command Center', location: 'IT Headquarters Building, Level 2', videoWallScreens: 24, activeWorkstations: 18, totalWorkstations: 20, activeOperatorCount: 18, status: 'operational', primaryLead: 'Harpreet Singh Sandhu', phone: '+91 181 299901', feedCount: 180 },
  { id: 'CR-LANG', code: 'CR-02', name: 'Langar & Supplies Control Sub-Center', location: 'Langar Complex Administrative Wing', videoWallScreens: 12, activeWorkstations: 8, totalWorkstations: 8, activeOperatorCount: 8, status: 'operational', primaryLead: 'Kulwant Singh', phone: '+91 181 299902', feedCount: 64 },
  { id: 'CR-SEC', code: 'CR-03', name: 'Joint Security & Police Liaison Room', location: 'Perimeter Security Tower 1', videoWallScreens: 16, activeWorkstations: 12, totalWorkstations: 14, activeOperatorCount: 12, status: 'alert', primaryLead: 'Deputy Commissioner Liaison', phone: '+91 181 299903', feedCount: 128 },
  { id: 'CR-TRAF', code: 'CR-04', name: 'Traffic & Parking Operations Desk', location: 'West Toll Barrier Transit Office', videoWallScreens: 8, activeWorkstations: 6, totalWorkstations: 6, activeOperatorCount: 6, status: 'operational', primaryLead: 'Surinder Singh Bawa', phone: '+91 181 299904', feedCount: 48 },
  { id: 'CR-MED', code: 'CR-05', name: 'Emergency Health & Disaster Center', location: 'Base Hospital Field Unit', videoWallScreens: 6, activeWorkstations: 4, totalWorkstations: 4, activeOperatorCount: 4, status: 'operational', primaryLead: 'Dr. Paramjit Singh', phone: '+91 181 299905', feedCount: 32 },
];

// Initial Inventory
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', itemCode: 'CAB-CAT6-305', name: 'D-Link Cat6 UTP 305M Solid Copper Cable Drum', category: 'Cables & Fiber', quantityInStock: 4, minThreshold: 10, unit: 'Rolls', warehouseLocation: 'Warehouse A / Rack 04', unitCost: 8500, issuedCount: 46, damagedCount: 1, vendorName: 'Netcom Solutions Ltd' },
  { id: 'inv-2', itemCode: 'FIB-SFP-10G', name: 'Cisco 10GBASE-LR SFP+ Transceiver Module', category: 'Network Hardware', quantityInStock: 18, minThreshold: 8, unit: 'Units', warehouseLocation: 'Warehouse B / Safe 02', unitCost: 12400, issuedCount: 32, damagedCount: 0, vendorName: 'Apex Data Networks' },
  { id: 'inv-3', itemCode: 'RAD-BAT-P86', name: 'Motorola IMPRES PMNN4409BR Li-ion Battery 2150mAh', category: 'Radios & Comms', quantityInStock: 22, minThreshold: 30, unit: 'Units', warehouseLocation: 'Warehouse A / Rack 01', unitCost: 3200, issuedCount: 140, damagedCount: 3, vendorName: 'Globe Telecommunications' },
  { id: 'inv-4', itemCode: 'CAM-4K-PTZ', name: 'Hikvision 4-inch 4MP 25X Powered-by-DarkFighter IR PTZ', category: 'CCTV & Optics', quantityInStock: 6, minThreshold: 5, unit: 'Units', warehouseLocation: 'Warehouse B / Rack 08', unitCost: 44000, issuedCount: 28, damagedCount: 2, vendorName: 'SecureVision Systems' },
  { id: 'inv-5', itemCode: 'SW-POE-24P', name: 'Cisco CBS350-24P-4G 24-Port Gigabit PoE Managed Switch', category: 'Network Hardware', quantityInStock: 3, minThreshold: 6, unit: 'Units', warehouseLocation: 'Warehouse B / Rack 03', unitCost: 68000, issuedCount: 18, damagedCount: 0, vendorName: 'Apex Data Networks' },
  { id: 'inv-6', itemCode: 'UPS-ONL-3KVA', name: 'APC Smart-UPS On-Line 3000VA 230V Rackmount', category: 'Power & UPS', quantityInStock: 2, minThreshold: 4, unit: 'Units', warehouseLocation: 'Warehouse C / Heavy Bay', unitCost: 92000, issuedCount: 14, damagedCount: 1, vendorName: 'PowerVolt Technologies' },
];

// Initial Purchase Requests
const INITIAL_PURCHASES: PurchaseRequest[] = [
  { id: 'po-1', poNumber: 'PO-2026-089', title: '5x Gigabit 24-Port PoE Switches & 10x 10G SFP+ for Outer Gates', requestedByDept: 'wifi', vendorName: 'Apex Data Networks', totalAmount: 485000, itemCount: 15, status: 'Submitted', priority: 'Critical', dateCreated: '2026-10-01 07:30 AM', estimatedDelivery: '2026-10-02' },
  { id: 'po-2', poNumber: 'PO-2026-088', title: '50x Motorola Replacement High-Capacity Battery Packs', requestedByDept: 'walkie', vendorName: 'Globe Telecommunications', totalAmount: 160000, itemCount: 50, status: 'Sub-Dept Approved', priority: 'High', dateCreated: '2026-09-30 04:15 PM', estimatedDelivery: '2026-10-03' },
  { id: 'po-3', poNumber: 'PO-2026-087', title: '12x 305M Cat6 Outdoor Armored Drums for Parking Lighting Poles', requestedByDept: 'inventory', vendorName: 'Netcom Solutions Ltd', totalAmount: 114000, itemCount: 12, status: 'Owner Approved', priority: 'High', dateCreated: '2026-09-29 11:00 AM', estimatedDelivery: '2026-10-02' },
  { id: 'po-4', poNumber: 'PO-2026-086', title: '10x Outdoor PTZ Dome Cameras for Langar Gate Expansion', requestedByDept: 'cctv', vendorName: 'SecureVision Systems', totalAmount: 440000, itemCount: 10, status: 'Dispatched', priority: 'High', dateCreated: '2026-09-28 02:00 PM', estimatedDelivery: '2026-10-01' },
];

// Initial Accommodation Rooms & Beds
const INITIAL_ROOMS: AccommodationRoom[] = [
  { id: 'room-1', campName: 'Camp Alpha - IT Core Sewadar Complex', roomNumber: 'Block A - 101', totalBeds: 8, occupiedBeds: 8, assignedSubDept: 'cctv', amenities: ['Air Cooled', 'Lockers', 'Gigabit WiFi', 'Ensuite Bath'], status: 'Full' },
  { id: 'room-2', campName: 'Camp Alpha - IT Core Sewadar Complex', roomNumber: 'Block A - 102', totalBeds: 8, occupiedBeds: 7, assignedSubDept: 'wifi', amenities: ['Air Cooled', 'Lockers', 'Gigabit WiFi', 'Ensuite Bath'], status: 'Available' },
  { id: 'room-3', campName: 'Camp Alpha - IT Core Sewadar Complex', roomNumber: 'Block B - 201', totalBeds: 12, occupiedBeds: 11, assignedSubDept: 'walkie', amenities: ['Air Cooled', 'Lockers', 'Charging Station'], status: 'Available' },
  { id: 'room-4', campName: 'Camp Beta - Shift Rotation Quarters', roomNumber: 'Night Pod N-04', totalBeds: 6, occupiedBeds: 4, assignedSubDept: 'control', amenities: ['Sound Insulated', 'Blackout Blinds', 'AC'], status: 'Available' },
];

const INITIAL_BEDS: AccommodationBed[] = [
  { id: 'b-1', bedCode: 'A101-B1', campName: 'Camp Alpha', roomNumber: 'Block A - 101', assignedSewadarId: 'sew-1', assignedSewadarName: 'Jaspreet Kaur Gill', assignedSubDept: 'cctv', status: 'Occupied', checkInDate: '2026-09-27' },
  { id: 'b-2', bedCode: 'A101-B2', campName: 'Camp Alpha', roomNumber: 'Block A - 101', assignedSewadarId: 'sew-2', assignedSewadarName: 'Gurdeep Singh Sandhu', assignedSubDept: 'cctv', status: 'Occupied', checkInDate: '2026-09-27' },
  { id: 'b-3', bedCode: 'A102-B1', campName: 'Camp Alpha', roomNumber: 'Block A - 102', assignedSewadarId: 'sew-3', assignedSewadarName: 'Navjot Singh', assignedSubDept: 'wifi', status: 'Occupied', checkInDate: '2026-09-28' },
  { id: 'b-4', bedCode: 'A102-B8', campName: 'Camp Alpha', roomNumber: 'Block A - 102', assignedSubDept: 'wifi', status: 'Vacant' },
  { id: 'b-5', bedCode: 'B201-B12', campName: 'Camp Alpha', roomNumber: 'Block B - 201', assignedSubDept: 'walkie', status: 'Vacant' },
];

// Initial Sewadars
const INITIAL_SEWADARS: Sewadar[] = [
  { id: 'sew-1', badgeNumber: 'SEW-IT-001', fullName: 'Jaspreet Kaur Gill', phone: '+91 98222 33445', city: 'Amritsar', subDepartmentId: 'cctv', team: 'Camera Field Maintenance & Mounting', role: 'Technician', currentShift: 'Morning (06:00-14:00)', dutyLocation: 'Sector A - Main Diwan Hall', attendanceToday: 'Present', accommodationBed: 'A101-B1' },
  { id: 'sew-2', badgeNumber: 'SEW-IT-002', fullName: 'Gurdeep Singh Sandhu', phone: '+91 98222 44556', city: 'Jalandhar', subDepartmentId: 'cctv', team: 'NVR & Optics Monitoring', role: 'NVR Operator', currentShift: 'Morning (06:00-14:00)', dutyLocation: 'CR-MAIN Floor', attendanceToday: 'Present', accommodationBed: 'A101-B2' },
  { id: 'sew-3', badgeNumber: 'SEW-IT-003', fullName: 'Navjot Singh Kahlon', phone: '+91 98222 55667', city: 'Ludhiana', subDepartmentId: 'wifi', team: 'Fiber Splicing & Switch Config', role: 'Network Engineer', currentShift: 'Evening (14:00-22:00)', dutyLocation: 'Sector B - Langar Distribution Hub', attendanceToday: 'Present', accommodationBed: 'A102-B1' },
  { id: 'sew-4', badgeNumber: 'SEW-IT-004', fullName: 'Harmanpreet Singh', phone: '+91 98222 66778', city: 'Patiala', subDepartmentId: 'walkie', team: 'Walkie Dispatch & Battery Fleet', role: 'Radio Dispatcher', currentShift: 'Morning (06:00-14:00)', dutyLocation: 'Main Walkie Depot', attendanceToday: 'Present' },
  { id: 'sew-5', badgeNumber: 'SEW-IT-005', fullName: 'Manmohan Singh Bedi', phone: '+91 98222 77889', city: 'Delhi', subDepartmentId: 'control', team: 'Video Wall & Stream Observers', role: 'Console Operator', currentShift: 'Night (22:00-06:00)', dutyLocation: 'CR-SEC Joint Security Tower', attendanceToday: 'Present' },
  { id: 'sew-6', badgeNumber: 'SEW-IT-006', fullName: 'Avtar Singh Sekhon', phone: '+91 98222 88990', city: 'Bathinda', subDepartmentId: 'inventory', team: 'Logistics & Warehouse Audit', role: 'Inventory Officer', currentShift: 'General Support', dutyLocation: 'Warehouse A Central Hub', attendanceToday: 'Present' },
  { id: 'sew-7', badgeNumber: 'SEW-IT-007', fullName: 'Balkar Singh', phone: '+91 98222 99001', city: 'Chandigarh', subDepartmentId: 'sewadars', team: 'Night Shift Rapid Deployment', role: 'Volunteer Coordinator', currentShift: 'Night (22:00-06:00)', dutyLocation: 'Sector D Outer Gates', attendanceToday: 'Absent' },
];

// Initial Needs Attention Items
const INITIAL_NEEDS_ATTENTION: NeedsAttentionItem[] = [
  { id: 'na-1', deptId: 'cctv', deptName: 'CCTV Surveillance', title: 'CAM-Z4-089 Outer Ring Gate 3 Offline', description: 'Power supply fault detected on PoE injector. Technician dispatched.', priority: 'Critical', category: 'offline', timestamp: '14 mins ago', targetView: { appId: 'cctv', tab: 'Cameras', itemId: 'c-4' }, resolved: false },
  { id: 'na-2', deptId: 'wifi', deptName: 'WiFi / Network', title: 'AP-LANGAR-04 High Latency (>540ms)', description: 'Channel interference on 2.4GHz. 289 clients affected in Langar Hall.', priority: 'High', category: 'issue', timestamp: '26 mins ago', targetView: { appId: 'wifi', tab: 'Issues', itemId: 'ap-3' }, resolved: false },
  { id: 'na-3', deptId: 'walkie', deptName: 'Walkie-Talkie', title: '18 Walkie Units Batch 12 Unassigned', description: 'Night traffic shift security personnel waiting at West Gate depot.', priority: 'High', category: 'unassigned', timestamp: '45 mins ago', targetView: { appId: 'walkie', tab: 'Allocation', itemId: 'w-5' }, resolved: false },
  { id: 'na-4', deptId: 'control', deptName: 'Control Rooms', title: 'Video Wall CR-SEC HDMI Matrix Glitch', description: 'Screen 5 & 6 dropped feeds from Sector D Perimeter.', priority: 'Medium', category: 'issue', timestamp: '1 hr ago', targetView: { appId: 'control', tab: 'Video Walls', itemId: 'CR-SEC' }, resolved: false },
  { id: 'na-5', deptId: 'sewadars', deptName: 'IT Sewadars', title: '14 Night Shift IT Volunteers Unassigned', description: 'Volunteers arrived at Camp Alpha without specific duty sector assignment.', priority: 'High', category: 'unassigned', timestamp: '2 hrs ago', targetView: { appId: 'sewadars', tab: 'Assignments' }, resolved: false },
  { id: 'na-6', deptId: 'inventory', deptName: 'Inventory', title: 'Cat6 Cable Drums below threshold (<5 remaining)', description: 'Only 4 drums left in Warehouse A. Min threshold is 10 drums.', priority: 'Medium', category: 'low_stock', timestamp: '3 hrs ago', targetView: { appId: 'inventory', tab: 'Low Stock', itemId: 'inv-1' }, resolved: false },
  { id: 'na-7', deptId: 'purchase', deptName: 'Purchase', title: 'PO-2026-089 Pending Owner Approval (₹4.85L)', description: '5x Gigabit PoE switches & 10G SFP+ modules required for gate expansion.', priority: 'Critical', category: 'pending_po', timestamp: '3 hrs ago', targetView: { appId: 'purchase', tab: 'Approvals', itemId: 'po-1' }, resolved: false },
  { id: 'na-8', deptId: 'purchase', deptName: 'Finance', title: 'Vendor Telecom Fiber Lease ₹4,20,000 Pending', description: 'Temporary 10Gbps leased line invoice due within 6 hours.', priority: 'High', category: 'pending_payment', timestamp: '4 hrs ago', targetView: { appId: 'purchase', tab: 'Payments' }, resolved: false },
  { id: 'na-9', deptId: 'wifi', deptName: 'Maintenance', title: 'Core Switch UPS Battery Test Scheduled', description: 'Scheduled preventive battery endurance test for Server Room UPS.', priority: 'Medium', category: 'maintenance', timestamp: '5 hrs ago', targetView: { appId: 'wifi', tab: 'Maintenance' }, resolved: false },
];

// Initial Audit Logs
const INITIAL_AUDITS: AuditLogItem[] = [
  { id: 'aud-1', userId: 'user-cctv-head', userName: 'Gurmeet Singh Virk', role: 'Head of CCTV', action: 'Approved Access Request for Jaspreet Kaur Gill', subDepartmentId: 'cctv', subDepartmentName: 'CCTV', timestamp: '10:42 AM', status: 'Completed', details: 'Granted technician permissions' },
  { id: 'aud-2', userId: 'user-wifi-head', userName: 'Harpreet Singh Sandhu', role: 'Principal Network Architect', action: 'Failover Triggered: ISP-1 Primary to ISP-2 Secondary', subDepartmentId: 'wifi', subDepartmentName: 'WiFi / Network', timestamp: '10:15 AM', status: 'Completed', details: 'Automated optical loss recovery' },
  { id: 'aud-3', userId: 'user-walkie-head', userName: 'Arvinder Singh Bindra', role: 'Head of Walkie Fleet', action: 'Issued 50 Motorola Radios to Traffic Unit Gate 4', subDepartmentId: 'walkie', subDepartmentName: 'Walkie-Talkie', timestamp: '09:30 AM', status: 'Completed', details: 'Dispatched with battery docks' },
  { id: 'aud-4', userId: 'user-owner', userName: 'Harminder Singh Dhillon', role: 'IT Owner / CIO', action: 'Super Admin Override: Authorized PO-2026-087 Emergency Fiber', subDepartmentId: 'purchase', subDepartmentName: 'Purchase', timestamp: '09:10 AM', status: 'Completed', details: 'Budget code EV-FIB-2026' },
  { id: 'aud-5', userId: 'user-sewadar-lead', userName: 'Taranjit Singh Chawla', role: 'IT Sewadar Director', action: 'Marked Morning Shift Attendance (412 Sewadars Present)', subDepartmentId: 'sewadars', subDepartmentName: 'IT Sewadars', timestamp: '08:00 AM', status: 'Completed', details: 'Shift 1 rollout confirmed' },
  { id: 'aud-6', userId: 'user-inventory-head', userName: 'Simranjeet Singh Sodhi', role: 'Head of Inventory', action: 'Flagged Damaged Equipment: 2x 4K PTZ Optics from West Bay', subDepartmentId: 'inventory', subDepartmentName: 'Inventory', timestamp: '07:22 AM', status: 'Flagged', details: 'Water ingress during thunderstorm' },
];

// Initial Access Requests
const INITIAL_ACCESS_REQUESTS: AccessRequest[] = [
  {
    id: 'req-1',
    userId: 'user-new-volunteer',
    userName: 'Amandeep Kaur Bhatia',
    userEmail: 'amandeep.volunteer@eventcommand.org',
    requestedSubDepartment: 'cctv',
    requestedRole: 'staff',
    reason: 'Volunteering as video monitoring operator for evening shift at Diwan Hall.',
    submittedAt: 'Today 09:15 AM',
    status: 'pending',
    assignedApproverRole: 'sub_dept_head',
  },
  {
    id: 'req-2',
    userId: 'user-walkie-volunteer',
    userName: 'Maninder Singh',
    userEmail: 'maninder.radio@eventcommand.org',
    requestedSubDepartment: 'walkie',
    requestedRole: 'staff',
    reason: 'Assisting with device dispatch and battery charging at West parking depot.',
    submittedAt: 'Today 08:30 AM',
    status: 'pending',
    assignedApproverRole: 'sub_dept_head',
  },
  {
    id: 'req-3',
    userId: 'user-wifi-contractor',
    userName: 'Rajesh Sharma',
    userEmail: 'rajesh.cisco@vendornet.com',
    requestedSubDepartment: 'wifi',
    requestedRole: 'staff',
    reason: 'OEM field engineer for Cisco AP troubleshooting and fiber testing.',
    submittedAt: 'Yesterday 04:00 PM',
    status: 'approved',
    assignedApproverRole: 'sub_dept_head',
    approverName: 'Harpreet Singh Sandhu',
    resolvedAt: 'Yesterday 05:20 PM',
  },
];

// Initial Notifications
const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-1', title: 'Critical CCTV Offline', message: 'CAM-Z4-089 at Outer Gate 3 is offline.', type: 'critical', subDept: 'cctv', timestamp: '14m ago', read: false },
  { id: 'notif-2', title: 'New Access Request', message: 'Amandeep Kaur requested Staff access to CCTV.', type: 'approval', subDept: 'cctv', timestamp: '1h ago', read: false },
  { id: 'notif-3', title: 'Purchase Order Approval Needed', message: 'PO-2026-089 (₹4,85,000) awaits Owner sign-off.', type: 'warning', subDept: 'purchase', timestamp: '3h ago', read: false },
  { id: 'notif-4', title: 'Low Stock Alert', message: 'Cat6 Cable drums below minimum buffer in Warehouse A.', type: 'warning', subDept: 'inventory', timestamp: '3h ago', read: true },
];

// Finance Summary
export const INITIAL_FINANCE: {
  incoming: number;
  outgoing: number;
  pending: number;
  transactions: FinanceTransaction[];
} = {
  incoming: 25000000, // ₹ 2.5 Crore Event IT Budget
  outgoing: 14500000, // ₹ 1.45 Crore Spent to date
  pending: 3200000,   // ₹ 32 Lakhs Invoices pending
  transactions: [
    { id: 'tx-1', type: 'outgoing', party: 'Apex Data Networks', category: 'Hardware Purchase', amount: 485000, date: 'Today 09:30 AM', status: 'Approval Required', poNumber: 'PO-2026-089' },
    { id: 'tx-2', type: 'outgoing', party: 'Bharti Airtel Telecom', category: '10Gbps Event Leased Line', amount: 420000, date: 'Today 08:00 AM', status: 'Processing' },
    { id: 'tx-3', type: 'outgoing', party: 'Globe Telecommunications', category: 'Walkie Batteries & Docks', amount: 160000, date: 'Yesterday', status: 'Settled', poNumber: 'PO-2026-088' },
    { id: 'tx-4', type: 'incoming', party: 'Executive Event Board', category: 'Emergency IT Tranche 2', amount: 5000000, date: '28 Sep 2026', status: 'Settled' },
    { id: 'tx-5', type: 'outgoing', party: 'Netcom Solutions Ltd', category: 'Armored Fiber Cable & Conduits', amount: 350000, date: '27 Sep 2026', status: 'Settled', poNumber: 'PO-2026-084' },
  ],
};

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  activeApp: SubDepartmentId | 'owner';
  setActiveApp: (app: SubDepartmentId | 'owner') => void;
  ownerActiveTab: string;
  setOwnerActiveTab: (tab: string) => void;
  subAppActiveTab: Record<SubDepartmentId, string>;
  setSubAppActiveTab: (dept: SubDepartmentId, tab: string) => void;
  
  // Security & RBAC
  users: UserProfile[];
  accessRequests: AccessRequest[];
  canAccessApp: (appId: SubDepartmentId | 'owner') => boolean;
  hasPermission: (permission: string) => boolean;
  submitAccessRequest: (requestedDept: SubDepartmentId, requestedRole: 'staff' | 'sub_dept_head', reason: string) => void;
  reviewAccessRequest: (requestId: string, status: 'approved' | 'rejected', notes?: string) => void;
  
  // Operational data
  needsAttention: NeedsAttentionItem[];
  resolveNeedsAttention: (id: string) => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, dept: SubDepartmentId | 'owner', details?: string) => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Sub-dept datasets
  cameras: CameraItem[];
  toggleCameraStatus: (id: string, status: 'online' | 'offline' | 'maintenance') => void;
  addCamera: (cam: Omit<CameraItem, 'id' | 'uptimePercent'>) => void;
  
  wifiAPs: WiFiAccessPoint[];
  toggleAPStatus: (id: string, status: 'online' | 'offline' | 'high_latency') => void;
  
  walkies: WalkieDevice[];
  allocateWalkie: (id: string, dept: string, toName: string, phone: string, channel: string) => void;
  returnWalkie: (id: string, condition: 'good' | 'damaged') => void;
  addWalkie: (walkie: Omit<WalkieDevice, 'id'>) => void;
  
  controlRooms: ControlRoom[];
  updateControlRoomStatus: (id: string, status: 'operational' | 'alert' | 'standby') => void;
  addControlRoom: (cr: Omit<ControlRoom, 'id'>) => void;
  editControlRoom: (id: string, updates: Partial<Omit<ControlRoom, 'id'>>) => void;
  deleteControlRoom: (id: string) => void;
  
  inventoryItems: InventoryItem[];
  issueInventoryItem: (id: string, count: number, dept: SubDepartmentId) => void;
  returnInventoryItem: (id: string, count: number) => void;
  restockInventoryItem: (id: string, count: number) => void;
  
  purchaseOrders: PurchaseRequest[];
  approvePurchaseOrder: (id: string, level: 'sub_dept' | 'owner') => void;
  createPurchaseOrder: (po: Omit<PurchaseRequest, 'id' | 'dateCreated'>) => void;
  
  accommodationRooms: AccommodationRoom[];
  accommodationBeds: AccommodationBed[];
  allotBed: (bedId: string, sewadarName: string, subDept: SubDepartmentId) => void;
  checkoutBed: (bedId: string) => void;
  
  sewadars: Sewadar[];
  markSewadarAttendance: (id: string, status: 'Present' | 'Absent' | 'On Leave') => void;
  reassignSewadar: (id: string, subDept: SubDepartmentId, shift: Sewadar['currentShift'], location: string) => void;
  
  finance: typeof INITIAL_FINANCE;
  accessDeniedTarget: SubDepartmentId | 'owner' | null;
  setAccessDeniedTarget: (target: SubDepartmentId | 'owner' | null) => void;
  isAccessRequestModalOpen: boolean;
  setIsAccessRequestModalOpen: (open: boolean) => void;
  requestTargetDept: SubDepartmentId;
  setRequestTargetDept: (dept: SubDepartmentId) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; initialApp?: SubDepartmentId | 'owner' }> = ({ children, initialApp = 'owner' }) => {
  // Current logged in user (defaults to Owner)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('event_it_current_user');
    return saved ? JSON.parse(saved) : PRESET_USERS[0];
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('event_it_users');
    return saved ? JSON.parse(saved) : PRESET_USERS;
  });

  // Current active navigation: 'owner' or sub-department
  const [activeApp, setActiveAppRaw] = useState<SubDepartmentId | 'owner'>(() => initialApp);

  const [ownerActiveTab, setOwnerActiveTab] = useState<string>('overview');

  const [subAppActiveTab, setSubAppActiveTabState] = useState<Record<SubDepartmentId, string>>({
    cctv: 'Dashboard',
    wifi: 'Dashboard',
    walkie: 'Dashboard',
    control: 'Dashboard',
    inventory: 'Dashboard',
    purchase: 'Dashboard',
    accommodation: 'Dashboard',
    sewadars: 'Dashboard',
  });

  const [accessDeniedTarget, setAccessDeniedTarget] = useState<SubDepartmentId | 'owner' | null>(null);
  const [isAccessRequestModalOpen, setIsAccessRequestModalOpen] = useState(false);
  const [requestTargetDept, setRequestTargetDept] = useState<SubDepartmentId>('cctv');

  // Operational states
  const [cameras, setCameras] = useState<CameraItem[]>(() => {
    const saved = localStorage.getItem('event_it_cameras');
    return saved ? JSON.parse(saved) : INITIAL_CAMERAS;
  });

  const [wifiAPs, setWifiAPs] = useState<WiFiAccessPoint[]>(() => {
    const saved = localStorage.getItem('event_it_wifi_aps');
    return saved ? JSON.parse(saved) : INITIAL_APS;
  });

  const [walkies, setWalkies] = useState<WalkieDevice[]>(() => {
    const saved = localStorage.getItem('event_it_walkies');
    return saved ? JSON.parse(saved) : INITIAL_WALKIES;
  });

  const [controlRooms, setControlRooms] = useState<ControlRoom[]>(() => {
    const saved = localStorage.getItem('event_it_control_rooms');
    return saved ? JSON.parse(saved) : INITIAL_CONTROL_ROOMS;
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('event_it_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseRequest[]>(() => {
    const saved = localStorage.getItem('event_it_purchases');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [accommodationRooms, setAccommodationRooms] = useState<AccommodationRoom[]>(() => {
    const saved = localStorage.getItem('event_it_rooms');
    return saved ? JSON.parse(saved) : INITIAL_ROOMS;
  });

  const [accommodationBeds, setAccommodationBeds] = useState<AccommodationBed[]>(() => {
    const saved = localStorage.getItem('event_it_beds');
    return saved ? JSON.parse(saved) : INITIAL_BEDS;
  });

  const [sewadars, setSewadars] = useState<Sewadar[]>(() => {
    const saved = localStorage.getItem('event_it_sewadars');
    return saved ? JSON.parse(saved) : INITIAL_SEWADARS;
  });

  const [needsAttention, setNeedsAttention] = useState<NeedsAttentionItem[]>(() => {
    const saved = localStorage.getItem('event_it_needs_attention');
    return saved ? JSON.parse(saved) : INITIAL_NEEDS_ATTENTION;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem('event_it_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDITS;
  });

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(() => {
    const saved = localStorage.getItem('event_it_access_requests');
    return saved ? JSON.parse(saved) : INITIAL_ACCESS_REQUESTS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('event_it_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [finance] = useState(INITIAL_FINANCE);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('event_it_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('event_it_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('event_it_cameras', JSON.stringify(cameras));
  }, [cameras]);

  useEffect(() => {
    localStorage.setItem('event_it_walkies', JSON.stringify(walkies));
  }, [walkies]);

  useEffect(() => {
    localStorage.setItem('event_it_inventory', JSON.stringify(inventoryItems));
  }, [inventoryItems]);

  useEffect(() => {
    localStorage.setItem('event_it_purchases', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('event_it_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('event_it_access_requests', JSON.stringify(accessRequests));
  }, [accessRequests]);

  // Strict RBAC Isolation Checking
  const canAccessApp = (appId: SubDepartmentId | 'owner'): boolean => {
    if (currentUser.role === 'owner') return true;
    if (appId === 'owner') return false;
    if (currentUser.role === 'dept_head') return true; // Non-owners cannot access Owner Control Center
    // Department head or staff can only access their assigned sub-department
    return currentUser.subDepartmentId === appId;
  };

  const hasPermission = (perm: string): boolean => {
    if (currentUser.role === 'owner') return true;
    return currentUser.permissions.includes(perm as any);
  };

  // Safe navigation with access control
  const setActiveApp = (targetApp: SubDepartmentId | 'owner') => {
    if (canAccessApp(targetApp)) {
      setActiveAppRaw(targetApp);
      window.location.hash = targetApp === 'owner' ? '#/' : '#/' + targetApp;
      setAccessDeniedTarget(null);
    } else {
      setAccessDeniedTarget(targetApp);
    }
  };

  const setSubAppActiveTab = (dept: SubDepartmentId, tab: string) => {
    setSubAppActiveTabState(prev => ({ ...prev, [dept]: tab }));
  };

  // Add audit log helper
  const addAuditLog = (action: string, dept: SubDepartmentId | 'owner', details?: string) => {
    const newLog: AuditLogItem = {
      id: `aud-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.designation,
      action,
      subDepartmentId: dept,
      subDepartmentName: dept === 'owner' ? 'Owner Command' : dept.toUpperCase(),
      timestamp: 'Just now',
      status: 'Completed',
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Resolve attention item
  const resolveNeedsAttention = (id: string) => {
    setNeedsAttention(prev => prev.map(item => item.id === id ? { ...item, resolved: true } : item));
    const item = needsAttention.find(i => i.id === id);
    if (item) {
      addAuditLog(`Resolved Attention Item: ${item.title}`, item.deptId);
    }
  };

  // Access request workflow
  const submitAccessRequest = (requestedDept: SubDepartmentId, requestedRole: 'staff' | 'sub_dept_head', reason: string) => {
    const newReq: AccessRequest = {
      id: `req-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      requestedSubDepartment: requestedDept,
      requestedRole,
      reason,
      submittedAt: 'Just now',
      status: 'pending',
      assignedApproverRole: 'sub_dept_head',
    };
    setAccessRequests(prev => [newReq, ...prev]);
    addAuditLog(`Submitted Access Request for ${requestedDept.toUpperCase()} (${requestedRole})`, requestedDept);
    
    // Also post notification
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'New Access Request',
      message: `${currentUser.name} requested access to ${requestedDept.toUpperCase()}`,
      type: 'approval',
      subDept: requestedDept,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const reviewAccessRequest = (requestId: string, status: 'approved' | 'rejected', notes?: string) => {
    setAccessRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          status,
          approverId: currentUser.id,
          approverName: currentUser.name,
          resolvedAt: 'Just now',
          notes,
        };
      }
      return req;
    }));

    const req = accessRequests.find(r => r.id === requestId);
    if (req && status === 'approved') {
      // Update the user's role and subDepartment in users list
      setUsers(prev => prev.map(u => {
        if (u.id === req.userId) {
          return {
            ...u,
            role: req.requestedRole,
            subDepartmentId: req.requestedSubDepartment,
            status: 'active',
            permissions: req.requestedRole === 'sub_dept_head' 
              ? ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export']
              : ['view', 'create', 'edit'],
          };
        }
        return u;
      }));

      // If current user is the one whose request was approved, update current user too
      if (currentUser.id === req.userId) {
        setCurrentUser(prev => ({
          ...prev,
          role: req.requestedRole,
          subDepartmentId: req.requestedSubDepartment,
          status: 'active',
        }));
      }

      addAuditLog(`Approved Access Request for ${req.userName} to ${req.requestedSubDepartment.toUpperCase()}`, req.requestedSubDepartment);
    } else if (req) {
      addAuditLog(`Rejected Access Request for ${req.userName}`, req.requestedSubDepartment, notes);
    }
  };

  // Operational sub-department handlers
  const toggleCameraStatus = (id: string, status: 'online' | 'offline' | 'maintenance') => {
    setCameras(prev => prev.map(c => c.id === id ? { ...c, status, lastPing: 'Just now' } : c));
    const cam = cameras.find(c => c.id === id);
    if (cam) {
      addAuditLog(`Updated Camera ${cam.cameraCode} status to ${status}`, 'cctv');
    }
  };

  const addCamera = (cam: Omit<CameraItem, 'id' | 'uptimePercent'>) => {
    const newCam: CameraItem = {
      ...cam,
      id: `c-${Date.now()}`,
      uptimePercent: 100.0,
    };
    setCameras(prev => [newCam, ...prev]);
    addAuditLog(`Registered New Camera ${newCam.cameraCode} (${newCam.name})`, 'cctv');
  };

  const toggleAPStatus = (id: string, status: 'online' | 'offline' | 'high_latency') => {
    setWifiAPs(prev => prev.map(ap => ap.id === id ? { ...ap, status } : ap));
    const ap = wifiAPs.find(a => a.id === id);
    if (ap) {
      addAuditLog(`Updated WiFi AP ${ap.apCode} status to ${status}`, 'wifi');
    }
  };

  const allocateWalkie = (id: string, dept: string, toName: string, phone: string, channel: string) => {
    setWalkies(prev => prev.map(w => {
      if (w.id === id) {
        return {
          ...w,
          assignedDept: dept,
          assignedToName: toName,
          assignedToPhone: phone,
          channelSet: channel,
          status: 'active',
          dispatchedAt: 'Just now',
          dueAt: 'Today 10:00 PM',
        };
      }
      return w;
    }));
    const walkie = walkies.find(w => w.id === id);
    if (walkie) {
      addAuditLog(`Allocated Walkie ${walkie.serialNumber} to ${toName} (${dept})`, 'walkie');
    }
  };

  const returnWalkie = (id: string, condition: 'good' | 'damaged') => {
    setWalkies(prev => prev.map(w => {
      if (w.id === id) {
        return {
          ...w,
          status: condition === 'good' ? 'in_storage' : 'maintenance',
          assignedToName: undefined,
          assignedToPhone: undefined,
        };
      }
      return w;
    }));
    const walkie = walkies.find(w => w.id === id);
    if (walkie) {
      addAuditLog(`Returned Walkie ${walkie.serialNumber} (Condition: ${condition})`, 'walkie');
    }
  };

  const addWalkie = (walkie: Omit<WalkieDevice, 'id'>) => {
    const newWalkie: WalkieDevice = {
      ...walkie,
      id: `w-${Date.now()}`,
    };
    setWalkies(prev => [newWalkie, ...prev]);
    addAuditLog(`Added New Walkie to Fleet: ${newWalkie.serialNumber}`, 'walkie');
  };

  const updateControlRoomStatus = (id: string, status: 'operational' | 'alert' | 'standby') => {
    setControlRooms(prev => prev.map(cr => cr.id === id ? { ...cr, status } : cr));
    const cr = controlRooms.find(r => r.id === id);
    if (cr) {
      addAuditLog(`Updated Control Room ${cr.code} status to ${status}`, 'control');
    }
  };

  const addControlRoom = (cr: Omit<ControlRoom, 'id'>) => {
    const newCr: ControlRoom = { ...cr, id: `CR-${Date.now()}` };
    setControlRooms(prev => [...prev, newCr]);
    addAuditLog(`Added Control Room ${newCr.code}: ${newCr.name}`, 'control');
  };

  const editControlRoom = (id: string, updates: Partial<Omit<ControlRoom, 'id'>>) => {
    setControlRooms(prev => prev.map(cr => cr.id === id ? { ...cr, ...updates } : cr));
    const cr = controlRooms.find(r => r.id === id);
    if (cr) addAuditLog(`Edited Control Room ${cr.code}: ${cr.name}`, 'control');
  };

  const deleteControlRoom = (id: string) => {
    const cr = controlRooms.find(r => r.id === id);
    setControlRooms(prev => prev.filter(r => r.id !== id));
    if (cr) addAuditLog(`Deleted Control Room ${cr.code}: ${cr.name}`, 'control');
  };

  const issueInventoryItem = (id: string, count: number, dept: SubDepartmentId) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantityInStock: Math.max(0, item.quantityInStock - count),
          issuedCount: item.issuedCount + count,
        };
      }
      return item;
    }));
    const item = inventoryItems.find(i => i.id === id);
    if (item) {
      addAuditLog(`Issued ${count}x ${item.name} to ${dept.toUpperCase()}`, 'inventory');
    }
  };

  const returnInventoryItem = (id: string, count: number) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantityInStock: item.quantityInStock + count,
          issuedCount: Math.max(0, item.issuedCount - count),
        };
      }
      return item;
    }));
    const item = inventoryItems.find(i => i.id === id);
    if (item) {
      addAuditLog(`Restocked/Returned ${count}x ${item.name}`, 'inventory');
    }
  };

  const restockInventoryItem = (id: string, count: number) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantityInStock: item.quantityInStock + count,
        };
      }
      return item;
    }));
    const item = inventoryItems.find(i => i.id === id);
    if (item) {
      addAuditLog(`Received Restock Batch: ${count}x ${item.name}`, 'inventory');
    }
  };

  const approvePurchaseOrder = (id: string, level: 'sub_dept' | 'owner') => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === id) {
        const nextStatus = level === 'owner' ? 'Owner Approved' : 'Sub-Dept Approved';
        return { ...po, status: nextStatus };
      }
      return po;
    }));
    const po = purchaseOrders.find(p => p.id === id);
    if (po) {
      addAuditLog(`${level === 'owner' ? 'IT Owner' : 'Sub-Dept Head'} Approved Purchase Order ${po.poNumber}`, 'purchase', `Amount: ₹${po.totalAmount.toLocaleString('en-IN')}`);
    }
  };

  const createPurchaseOrder = (po: Omit<PurchaseRequest, 'id' | 'dateCreated'>) => {
    const newPO: PurchaseRequest = {
      ...po,
      id: `po-${Date.now()}`,
      dateCreated: 'Just now',
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    addAuditLog(`Generated New Purchase Order ${newPO.poNumber}`, 'purchase', newPO.title);
  };

  const allotBed = (bedId: string, sewadarName: string, subDept: SubDepartmentId) => {
    setAccommodationBeds(prev => prev.map(bed => {
      if (bed.id === bedId) {
        return {
          ...bed,
          status: 'Occupied',
          assignedSewadarName: sewadarName,
          assignedSubDept: subDept,
          checkInDate: 'Today',
        };
      }
      return bed;
    }));
    addAuditLog(`Allotted Bed ${bedId} to ${sewadarName} (${subDept.toUpperCase()})`, 'accommodation');
  };

  const checkoutBed = (bedId: string) => {
    setAccommodationBeds(prev => prev.map(bed => {
      if (bed.id === bedId) {
        return {
          ...bed,
          status: 'Vacant',
          assignedSewadarName: undefined,
          assignedSewadarId: undefined,
          checkInDate: undefined,
        };
      }
      return bed;
    }));
    addAuditLog(`Processed Check-out for Bed ${bedId}`, 'accommodation');
  };

  const markSewadarAttendance = (id: string, status: 'Present' | 'Absent' | 'On Leave') => {
    setSewadars(prev => prev.map(s => s.id === id ? { ...s, attendanceToday: status } : s));
    const s = sewadars.find(item => item.id === id);
    if (s) {
      addAuditLog(`Marked Attendance for ${s.fullName} (${s.badgeNumber}): ${status}`, 'sewadars');
    }
  };

  const reassignSewadar = (id: string, subDept: SubDepartmentId, shift: Sewadar['currentShift'], location: string) => {
    setSewadars(prev => prev.map(s => s.id === id ? { ...s, subDepartmentId: subDept, currentShift: shift, dutyLocation: location } : s));
    const s = sewadars.find(item => item.id === id);
    if (s) {
      addAuditLog(`Reassigned Sewadar ${s.fullName} to ${subDept.toUpperCase()} (${shift}) at ${location}`, 'sewadars');
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeApp,
        setActiveApp,
        ownerActiveTab,
        setOwnerActiveTab,
        subAppActiveTab,
        setSubAppActiveTab,
        users,
        accessRequests,
        canAccessApp,
        hasPermission,
        submitAccessRequest,
        reviewAccessRequest,
        needsAttention,
        resolveNeedsAttention,
        auditLogs,
        addAuditLog,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        cameras,
        toggleCameraStatus,
        addCamera,
        wifiAPs,
        toggleAPStatus,
        walkies,
        allocateWalkie,
        returnWalkie,
        addWalkie,
        controlRooms,
        updateControlRoomStatus,
        addControlRoom,
        editControlRoom,
        deleteControlRoom,
        inventoryItems,
        issueInventoryItem,
        returnInventoryItem,
        restockInventoryItem,
        purchaseOrders,
        approvePurchaseOrder,
        createPurchaseOrder,
        accommodationRooms,
        accommodationBeds,
        allotBed,
        checkoutBed,
        sewadars,
        markSewadarAttendance,
        reassignSewadar,
        finance,
        accessDeniedTarget,
        setAccessDeniedTarget,
        isAccessRequestModalOpen,
        setIsAccessRequestModalOpen,
        requestTargetDept,
        setRequestTargetDept,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
