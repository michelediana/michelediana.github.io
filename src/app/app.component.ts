import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TopbarComponent } from './components/topbar.component';
import { KpiRowComponent } from './components/kpi-row.component';
import { BalanceChartComponent } from './charts/balance-chart.component';
import { IncomeExpenseChartComponent } from './charts/income-expense-chart.component';
import { CategoryBreakdownComponent } from './components/category-breakdown.component';
import { BudgetListComponent } from './components/budget-list.component';
import { TransactionsTableComponent } from './components/transactions-table.component';
import { TransactionDialogComponent } from './components/transaction-dialog.component';
import { BudgetDialogComponent } from './components/budget-dialog.component';
import { ToastComponent } from './components/toast.component';
import { Transaction } from './models/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TopbarComponent, KpiRowComponent, BalanceChartComponent, IncomeExpenseChartComponent,
    CategoryBreakdownComponent, BudgetListComponent, TransactionsTableComponent,
    TransactionDialogComponent, BudgetDialogComponent, ToastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  private txnDialog = viewChild.required(TransactionDialogComponent);
  private budgetDialog = viewChild.required(BudgetDialogComponent);

  openAddTransaction(): void {
    this.txnDialog().open(null);
  }

  openEditTransaction(txn: Transaction): void {
    this.txnDialog().open(txn);
  }

  openBudgetDialog(): void {
    this.budgetDialog().open();
  }
}
