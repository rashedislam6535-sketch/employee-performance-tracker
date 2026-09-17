import { User, EmployeeProfile } from "@/types";

export interface AuthSession {
  user: User;
  employee: EmployeeProfile;
  token: string;
}

export const DEMO_USERS: Array<{
  user: User;
  employee: EmployeeProfile;
  password: string;
}> = [
  {
    user: {
      id: 1,
      name: "Sarah Connor",
      email: "sarah.admin@workpulse.io",
      role: "admin",
      department: "Operations & Leadership",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    employee: {
      id: 1,
      userId: 1,
      name: "Sarah Connor",
      nickname: "Sarah",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      dob: "1988-06-14",
      phone: "+1 (555) 234-5678",
      bloodGroup: "O+",
      email: "sarah.admin@workpulse.io",
      department: "Operations & Leadership",
      designation: "Director of Operations & Admin",
      employeeCode: "ADM-1001",
      availability: "available",
    },
    password: "admin",
  },
  {
    user: {
      id: 2,
      name: "Alex Johnson",
      email: "alex.j@workpulse.io",
      role: "employee",
      department: "Customer Support",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
    employee: {
      id: 2,
      userId: 2,
      name: "Alex Johnson",
      nickname: "Alex",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      dob: "1994-04-18",
      phone: "+1 (555) 432-8765",
      bloodGroup: "A+",
      email: "alex.j@workpulse.io",
      department: "Customer Support",
      designation: "Senior Support Lead",
      employeeCode: "EMP-2041",
      availability: "available",
    },
    password: "password123",
  },
  {
    user: {
      id: 3,
      name: "Michael Chen",
      email: "michael.c@workpulse.io",
      role: "employee",
      department: "Compliance & KYC",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    employee: {
      id: 3,
      userId: 3,
      name: "Michael Chen",
      nickname: "Mike",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      dob: "1992-11-09",
      phone: "+1 (555) 876-1234",
      bloodGroup: "B+",
      email: "michael.c@workpulse.io",
      department: "Compliance & KYC",
      designation: "KYC Compliance Specialist",
      employeeCode: "EMP-3012",
      availability: "busy",
    },
    password: "password123",
  },
  {
    user: {
      id: 4,
      name: "Elena Rodriguez",
      email: "elena.r@workpulse.io",
      role: "employee",
      department: "Client Success",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
    employee: {
      id: 4,
      userId: 4,
      name: "Elena Rodriguez",
      nickname: "Elena",
      photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      dob: "1996-08-22",
      phone: "+1 (555) 789-6543",
      bloodGroup: "AB+",
      email: "elena.r@workpulse.io",
      department: "Client Success",
      designation: "Client Success Manager",
      employeeCode: "EMP-4055",
      availability: "available",
    },
    password: "password123",
  },
  {
    user: {
      id: 5,
      name: "David Kim",
      email: "david.k@workpulse.io",
      role: "employee",
      department: "Technical Operations",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    employee: {
      id: 5,
      userId: 5,
      name: "David Kim",
      nickname: "Dave",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      dob: "1991-03-30",
      phone: "+1 (555) 321-9870",
      bloodGroup: "O-",
      email: "david.k@workpulse.io",
      department: "Technical Operations",
      designation: "Senior Tech Operations Analyst",
      employeeCode: "EMP-5088",
      availability: "offline",
    },
    password: "password123",
  },
];
