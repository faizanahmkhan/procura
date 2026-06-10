import type { FC } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const Header: FC<HeaderProps> = ({ title, subtitle, action }) => {
  return (
    <header className="bg-[#0f1219] border-b border-[#1a2035] px-8 py-4 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-[17px] font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#4a6880] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
};

export default Header;
