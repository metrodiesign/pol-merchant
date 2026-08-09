export interface NavItem {
  title: string;
  path: string;
  icon?: string;
  children?: NavItem[];
  badge?: string;
  caption?: string;
  disabled?: boolean;
  deepMatch?: boolean;
  match?: string | string[];
  exclude?: string[];
}

export interface NavGroup {
  subheader: string;
  items: NavItem[];
}

export const navConfig: NavGroup[] = [
  {
    subheader: "Main",
    items: [{ title: "แดชบอร์ด", path: "/dashboard", icon: "dashboard" }],
  },
  {
    subheader: "ระบบงานขาย",
    items: [
      {
        title: "กรมธรรม์",
        path: "/policy/list",
        icon: "invoice",
        match: ["/policy", "/checkout"],
      },
      {
        title: "คำสั่งซื้อ",
        path: "/order/list",
        icon: "order",
        match: "/order",
      },
      {
        title: "รายการชำระเงิน",
        path: "/transaction/list",
        icon: "invoice",
        match: "/transaction",
      },
    ],
  },
  {
    subheader: "ตัวแทน/นายหน้า",
    items: [
      {
        title: "ตัวแทน/นายหน้า",
        path: "/merchant/user/list",
        icon: "user",
        match: "/merchant/user",
      },
      {
        title: "บทบาทและสิทธิ์",
        path: "/merchant/role/list",
        icon: "lock",
        match: "/merchant/role",
      },
    ],
  },
];
