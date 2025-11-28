import DashboardView from './DashboardView.jsx';
import AccuraAIView from './AccuraAIView.jsx';
import TasksView from './TasksView.jsx';
import ProductsView from './ProductsView.jsx';
import CustomersView from './CustomersView.jsx';
import SalesView from './SalesView.jsx';
import ExpensesView from './ExpensesView.jsx';
import EmployeesView from './EmployeesView.jsx';
import InvoicesView from './InvoicesView.jsx';
import ReportsView from './ReportsView.jsx';
import JournalView from './JournalView.jsx';
import PnlView from './PnlView.jsx';
import LedgerView from './LedgerView.jsx';
import TrialBalanceView from './TrialBalanceView.jsx';
import BalanceSheetView from './BalanceSheetView.jsx';
import InboxView from './InboxView.jsx';
import TeamHubView from './TeamHubView.jsx';
import OwlStudiosView from './OwlStudiosView.jsx';
import SettingsView from './SettingsView.jsx';
import BotView from './BotView.jsx';
import SupervisionView from './SupervisionView.jsx';
import QuickSaleView from './QuickSaleView.jsx';
import LoginView from './LoginView.jsx';
import UserSelectionView from './UserSelectionView.jsx';
import PurchasingView from './PurchasingView.jsx';
import ChartOfAccountsView from './ChartOfAccountsView.jsx';
import OwlLogsView from './OwlLogsView.jsx';

export const authenticatedViewMap = {
  dashboard: DashboardView,
  'accura-ai': AccuraAIView,
  tasks: TasksView,
  'stock-requests': TasksView,
  products: ProductsView,
  customers: CustomersView,
  sales: SalesView,
  expenses: ExpensesView,
  employees: EmployeesView,
  invoices: InvoicesView,
  reports: ReportsView,
  journal: JournalView,
  pnl: PnlView,
  ledger: LedgerView,
  'trial-balance': TrialBalanceView,
  'balance-sheet': BalanceSheetView,
  'chart-of-accounts': ChartOfAccountsView,
  inbox: InboxView,
  supervision: SupervisionView,
  'team-hub': TeamHubView,
  'owl-studios': OwlStudiosView,
  'owl-logs': OwlLogsView,
  purchasing: PurchasingView,
  settings: SettingsView,
  bot: BotView,
};

export const specialViews = {
  login: LoginView,
  userSelection: UserSelectionView,
  quickSale: QuickSaleView,
};








