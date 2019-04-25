import React, { Component } from 'react';
import '../../App.css';
import '../../css/SemaSales.css';
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as healthCheckActions from '../../actions/healthCheckActions';
import { withRouter } from 'react-router'
import SemaServiceError from "../SeamaServiceError";
import SemaDatabaseError from "../SeamaDatabaseError";
import SalesSummaryPanel1 from "./Sales/SalesSummaryPanel1";
// import SalesSummaryPanel2 from "./Sales/SalesSummaryPanel2";
import SalesMapContainer from './Sales/SalesMapContainer';
import SalesRetailerList from './Sales/SalesRetailerList';
import { salesActions } from '../../actions';
import SalesByChannelChart from "./Sales/SalesByChannelChart";
import SalesByChannelTimeChart from "./Sales/SalesByChannelTimeChart";
import LoadProgress from "../LoadProgress";
import { utilService } from '../../services';
import MaterialTable from 'material-table';
import sort from 'fast-sort';
import moment from 'moment-timezone';
import uuidv1 from 'uuid/v1';

let dateFormat = require('dateformat');

class SemaSales extends Component {
	constructor(props, context) {
		super(props, context);
		console.log("SeamaSales - Constructor");

		this.state = {
			selectedReceipt: null,
			isTableLoading: false
		}

		// We need this as a select, not a text input
		// That's why we're doing this ugly mapping
		this.paymentTypesMapping = {
			'Cash': 'Cash',
			'Cash/Loan': 'Cash/Loan',
			'Mobile': 'Mobile',
			'Mobile/Loan': 'Mobile/Loan',
			'Card': 'Card',
			'Card/Loan': 'Card/Loan'
		};

		this.columns = [
			{
				title: 'ID',
				field: 'id',
				readonly: true,
				hidden: true
			},
			{
				title: 'Created Date',
				field: 'created_at',
				type: 'datetime',
				readonly: true
			},
			{
				title: 'Updated Date',
				field: 'updated_at',
				type: 'datetime',
				readonly: true
			},
			{
				title: 'Customer Name',
				field: 'customer_account_id',
				lookup: {},
				emptyValue: 'N/A'
			},
			{
				title: 'Product SKU',
				field: 'product_id',
				lookup: {},
				emptyValue: 'N/A'
			},
			{
				title: 'Quantity',
				field: 'quantity',
				type: 'numeric',
				emptyValue: 'N/A'
			},
			{
				title: 'Unit Price',
				field: 'unit_price',
				type: 'numeric',
				emptyValue: 0.00,
				readonly: true
			},
			{
				title: 'Total Price',
				field: 'total_price',
				type: 'numeric',
				emptyValue: 0.00,
				readonly: true
			},
			{
				title: 'Amount Loan',
				field: 'amount_loan',
				type: 'numeric',
				emptyValue: 0.00
			},
			{
				title: 'Payment Type',
				field: 'payment_type',
				lookup: this.paymentTypesMapping,
				emptyValue: 'Cash'
			},
			{
				title: 'Total Cogs',
				field: 'total_cogs',
				type: 'numeric',
				emptyValue: 0.00,
				readonly: true
			},
			{
				title: 'Status',
				field: 'active',
				lookup: {
					false: 'Inactive',
					true: 'Active'
				}
			}
		];

		this._prepareColumns = this._prepareColumns.bind(this);
		this._prepareData = this._prepareData.bind(this);
		this._prepareSale = this._prepareSale.bind(this);
	}

	render() {
		return this.showContent();
	}

	showContent(props) {
		if (this.props.healthCheck.server !== "Ok") {
			return SemaServiceError(props);
		} else if (this.props.healthCheck.database !== "Ok") {
			return SemaDatabaseError(props)
		}
		return this.showSales();

	}

	showSales() {
		return (
			<React.Fragment>
				<div className="SalesProgress">
					<LoadProgress />
				</div>

				<div className="SalesContainer">
					<div className="SalesSummaryContainer">
						<div className="SalesSummaryItem">
							<SalesSummaryPanel1 title="Total Customers" date={this.getDateSince(this.props.sales.salesInfo.totalCustomers)}
								value={formatTotalCustomers(this.props.sales.salesInfo)}
								delta={calcCustomerDelta(this.props.sales.salesInfo)}
								valueColor={calcColor(this.props.sales.salesInfo.totalCustomers.periods[0].value, this.props.sales.salesInfo.totalCustomers.periods[1].value)} />
						</div>
						<div className="SalesSummaryItem">
							<SalesSummaryPanel1 title="Total Revenue" date={this.getDateSince(this.props.sales.salesInfo.totalRevenue)}
								value={utilService.formatDollar(this.props.sales.salesInfo.currencyUnits, this.props.sales.salesInfo.totalRevenue.total)}
								delta={calcRevenueDelta(this.props.sales.salesInfo)}
								valueColor={calcColor(this.props.sales.salesInfo.totalRevenue.periods[0].value, this.props.sales.salesInfo.totalRevenue.periods[1].value)} />
						</div>
						<div className="SalesSummaryItem">
							<SalesSummaryPanel1 title="Gross Margin" date={this.getDateSince(this.props.sales.salesInfo.totalRevenue)}
								value={calcNetRevenue(this.props.sales.salesInfo)}
								delta={calcNetRevenueDelta(this.props.sales.salesInfo)}
								valueColor={calcNetRevenueColor(this.props.sales.salesInfo)} />
						</div>
					</div>

					<div className="SalesContentContainer">
						<div className="SalesMapItem" id="salesMapId">
							<SalesMapContainer google={this.props.google} retailers={this.props.sales.salesInfo.customerSales} kiosk={this.props.kiosk} />
						</div>
						<div className="SalesListItem">
							<div><p style={{ textAlign: "center" }}>{formatRetailSalesHeader(this.props.sales.salesInfo.customerSales)}</p></div>
							<SalesRetailerList retailers={this.props.sales.salesInfo.customerSales} />
						</div>
						<div className="SalesBottomContainer">
							<div className="SalesBottomRight">
								<SalesByChannelTimeChart chartData={this.props.sales} />
								{/*<SalesSummaryPanel2 title="Revenue/Customer"*/}
								{/*value={ formatRevenuePerCustomer(this.props.sales.salesInfo)}*/}
								{/*valueColor = "rgb(24, 55, 106)"*/}
								{/*title2 = {formatNoOfCustomers(this.props.sales.salesInfo)} />*/}
							</div>
							<div className="SalesBottomLeft">
								<SalesByChannelChart chartData={this.props.sales} />
							</div>
						</div>
					</div>

					<div className="SalesList">
						<MaterialTable
							isLoading={this.state.isTableLoading}
							parentChildData={(row, rows) => rows.find(r => r.id === row.receipt_id)}
							onRowClick={(event, selectedRow) => {
								// We only want to be able to select receipts, not line items
								if (!selectedRow.receipt_id) {
									// We make it a toggle
									if (this.state.selectedReceipt && selectedRow.id === this.state.selectedReceipt.id) {
										this.setState({ selectedReceipt: null });
									} else {
										this.setState({ selectedReceipt: selectedRow });
									}
								}
							}}
							options={{
								headerStyle: styles.tableHeader,
								showTitle: false,
								columnsButton: true,
								loadingType: 'linear',
								pageSize: 5,
								exportButton: false, // We'll activate this once this feature allows to export the whole table, not just the visible rows 
								pageSizeOptions: [5, 10, 15, 20, 25, 30],
								addRowPosition: 'first',
								rowStyle: rowData => ({
									backgroundColor: (this.state.selectedReceipt && this.state.selectedReceipt.tableData.id === rowData.tableData.id) ? '#EEE' : '#FFF'
								})
								// exportFileName: 'dlohaiti-sales' add the toolbar filters to the name
							}}
							columns={this._prepareColumns()}
							data={this._prepareData()}
							editable={{
								onRowAdd: sale =>
									new Promise((resolve, reject) => {

										this.setState({ isTableLoading: true });

										const finalSale = this._prepareSale(sale);

										this.props.salesActions.createSale(finalSale)
											.then(() => {
												this.setState({ isTableLoading: false });

												resolve();
											})
											.catch(err => {
												this.setState({ isTableLoading: false });

												alert(`Something went wrong: ${JSON.stringify(err.response)}`);
												resolve();
											});
									}),

								onRowUpdate: (newData, oldData) =>
									new Promise((resolve, reject) => {
										setTimeout(() => {
											{
												/* const data = this.state.data;
												const index = data.indexOf(oldData);
												data[index] = newData;
												this.setState({ data }, () => resolve()); */
											}
											resolve()
										}, 1000)
									}),

								onRowDelete: oldData =>
									new Promise((resolve, reject) => {
										setTimeout(() => {
											{
												/* let data = this.state.data;
												const index = data.indexOf(oldData);
												data.splice(index, 1);
												this.setState({ data }, () => resolve()); */
											}
											resolve()
										}, 1000)
									}),
							}}
						/>
					</div>
				</div>
			</React.Fragment>
		);
	}

	_prepareColumns() {
		// An ID - Name mapping of customers. Sorted alphabetically
		let orderedCustomers = sort([...this.props.customer.dataset]).asc(customer => customer.name);
		let customerMapping = orderedCustomers.reduce((final, customer) => {
			final[`${customer.id}`] = customer.name;
			return final;
		}, {});

		const customerNameColumn = {
			title: 'Customer Name',
			field: 'customer_account_id',
			lookup: customerMapping,
			emptyValue: 'N/A'
		};

		// An ID - SKU mapping of products. Sorted alphabetically
		let orderedProducts = sort([...this.props.products]).asc(product => product.sku);
		let productMapping = orderedProducts.reduce((final, product) => {
			final[`${product.id}`] = product.sku;
			return final;
		}, {});

		const productSkuColumn = {
			title: 'Product SKU',
			field: 'product_id',
			lookup: productMapping,
			emptyValue: 'N/A'
		};

		// Add the "Customer Name" column right after the "Updated Date" one
		this.columns.splice(3, 1, customerNameColumn);
		// Add the "Product SKU" column right after the "Customer Name" one
		this.columns.splice(4, 1, productSkuColumn);

		return this.columns;
	}

	_prepareData() {
		let orderedSales = sort([...this.props.sales.dataset]).desc(sale => sale.created_at);

		return orderedSales.map(row => {
			row.created_at = moment.tz(row.created_at, moment.tz.guess()).format('YYYY-MM-DD HH:mm:ss');
			row.updated_at = moment.tz(row.updated_at, moment.tz.guess()).format('YYYY-MM-DD HH:mm:ss');

			return row;
		});
	}

	_prepareSale(sale) {
		sale.id = moment.tz(sale.created_at, moment.tz.guess()).format();
		sale.kiosk_id = this.props.kiosk.selectedKiosk.kioskID;
		sale.user_id = this.props.auth.currentUser.id;
		sale.uuid = uuidv1();

		if (this.state.selectedReceipt) {
			sale.receipt_id = this.state.selectedReceipt.id;
		}

		return sale;
	}

	getDateSince(metric) {
		if (metric.periods[1].beginDate != null) {
			switch (metric.period) {
				case "month":
					return " since " + dateFormat(convertDateToUTC(new Date(Date.parse(metric.periods[1].beginDate))), "mmm, yyyy");
				case "year":
					return " since " + dateFormat(convertDateToUTC(new Date(Date.parse(metric.periods[1].beginDate))), "yyyy");
				case "none":
				default:
					return "";
			}
		} else {
			return "N/A"
		}
	}

}

function convertDateToUTC(date) {
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const calcNetRevenue = salesInfo => {
	if (salesInfo.totalRevenue.total && salesInfo.totalCogs.total) {
		return utilService.formatDollar(salesInfo.currencyUnits, salesInfo.totalRevenue.total - salesInfo.totalCogs.total);
	} else {
		return "N/A";
	}
}

const calcNetRevenueDelta = salesInfo => {
	if (salesInfo.totalRevenue.period === "none") {
		return "";
	} else {
		if (salesInfo.totalRevenue.periods[0].value && salesInfo.totalCogs.periods[0].value &&
			salesInfo.totalRevenue.periods[1].value && salesInfo.totalCogs.periods[1].value) {
			return calcChange(salesInfo, salesInfo.totalRevenue.periods[0].value - salesInfo.totalCogs.periods[0].value,
				salesInfo.totalRevenue.periods[1].value - salesInfo.totalCogs.periods[1].value)
		} else {
			return "N/A";
		}
	}
}
const calcCustomerDelta = salesInfo => {
	if (salesInfo.totalCustomers.period === "none") {
		return "";
	} else {
		return calcChange(salesInfo, salesInfo.totalCustomers.periods[0].value, salesInfo.totalCustomers.periods[1].value);
	}
}
const calcRevenueDelta = salesInfo => {
	if (salesInfo.totalRevenue.period === "none") {
		return "";
	} else {
		return calcChange(salesInfo, salesInfo.totalRevenue.periods[0].value, salesInfo.totalRevenue.periods[1].value);
	}
}

const calcNetRevenueColor = salesInfo => {
	if (salesInfo.totalRevenue.periods[0].value && salesInfo.totalCogs.periods[0].value &&
		salesInfo.totalRevenue.periods[1].value && salesInfo.totalCogs.periods[1].value) {
		return calcColor(salesInfo.totalRevenue.periods[0].value - salesInfo.totalCogs.periods[0].value,
			salesInfo.totalRevenue.periods[1].value - salesInfo.totalCogs.periods[1].value)
	} else {
		return "gray";
	}
}

const formatTotalCustomers = salesInfo => {
	return (salesInfo.totalCustomers.total) ? salesInfo.totalCustomers.total : "N/A";
}

const formatRetailSalesHeader = (retailSales) => {
	if (retailSales.length > 0) {
		switch (retailSales[0].period) {
			case "none":
				return "Total Sales";
			case "year":
				let startDate = dateFormat(convertDateToUTC(new Date(Date.parse(retailSales[0].periods[0].beginDate))), "mmm, yyyy");
				let endDate = dateFormat(convertDateToUTC(new Date(Date.parse(retailSales[0].periods[0].endDate))), "mmm, yyyy");
				return "Sales from " + startDate + " - " + endDate;
			case "month":
				startDate = dateFormat(convertDateToUTC(new Date(Date.parse(retailSales[0].periods[0].beginDate))), "mmm, d, yyyy");
				endDate = dateFormat(convertDateToUTC(new Date(Date.parse(retailSales[0].periods[0].endDate))), "mmm, d, yyyy");
				return "Sales from " + startDate + " - " + endDate;
			default:
				return "";
		}
	}
	return "No data available";
};

// const formatRevenuePerCustomer = (salesInfo) =>{
// 	if( salesInfo.totalRevenue.period ){
// 		let revenuePerCustomer = 0;
// 		switch( salesInfo.totalRevenue.period ){
// 			case "none":
// 				revenuePerCustomer = salesInfo.totalRevenue.total/salesInfo.customerCount;
// 				break;
// 			case "year":
// 			case "month":
// 				revenuePerCustomer = salesInfo.totalRevenue.periods[0].value/salesInfo.customerCount;
// 				break;
// 			default:
// 				revenuePerCustomer = 0;
// 		}
// 		return utilService.formatDollar( salesInfo.currencyUnits, revenuePerCustomer );
// 	}
// 	return "N/A";
// };

// const formatNoOfCustomers = (salesInfo) =>{
// 	if( salesInfo.totalRevenue.period ){
// 		return "For " + salesInfo.customerCount + " customers";
// 	}
// 	return "";
// };




// const formatLitersPerCustomer = litersPerCustomer =>{
// 	if( litersPerCustomer === "N/A"){
// 		return litersPerCustomer;
// 	}else{
// 		return String(parseFloat(litersPerCustomer.value.toFixed(0)));
// 	}
// };
// const formatLitersPerPeriod = litersPerCustomer =>{
// 	return "Liters/" + litersPerCustomer;
// };
// const formatCustomerGrowth = newCustomers =>{
// 	if( typeof newCustomers.periods[1].periodValue === "string" ||
// 		typeof newCustomers.periods[2].periodValue === "string"){
// 		return "N/A";
// 	}else{
// 		return ((newCustomers.periods[1].periodValue/newCustomers.periods[2].periodValue *100) -100).toFixed(2) + "%"
// 	}
// };


const calcChange = (salesInfo, now, last) => {
	if (!now || !last) {
		return "N/A"
	} else {
		// Pro-rate the current period of it is incomplete
		let nowDate = new Date();
		switch (salesInfo.totalCustomers.period) {
			case "year":
				let periodYear = new Date(Date.parse(salesInfo.totalCustomers.periods[0].beginDate)).getFullYear();
				if (nowDate.getFullYear() === periodYear) {
					let start = new Date(periodYear, 0, 0);
					let diff = nowDate - start;
					let oneDay = 1000 * 60 * 60 * 24;
					let dayOfYear = Math.floor(diff / oneDay);

					now = ((365 * now) / dayOfYear)
				}
				break;
			case "month":
			default:
				let period = new Date(Date.parse(salesInfo.totalCustomers.periods[0].beginDate));
				periodYear = period.getFullYear();
				let periodMonth = period.getMonth();
				if (nowDate.getFullYear() === periodYear && nowDate.getMonth() === periodMonth) {
					let dayOfMonth = nowDate.getDate();
					let daysInMonth = new Date(periodYear, periodMonth + 1, 0).getDate(); // Note: this is a trick to get the last day of the month
					now = ((daysInMonth * now) / dayOfMonth)
				}
				break;
		}
		return ((now / last) * 100 - 100).toFixed(2) + "%";
	}

};
const calcColor = (now, last) => {
	if (!now || !last) {
		return "gray"
	} else {
		if (now > last) return "green";
		else if (now < last) return "red";
	}
	return "gray"
};

const styles = {
	tableHeader: {
		fontSize: 'inherit'
	}
}

function mapStateToProps(state) {
	return {
		sales: state.sales,
		kiosk: state.kiosk,
		healthCheck: state.healthCheck,
		products: state.products,
		customer: state.customer,
		auth: state.auth
	};
}

function mapDispatchToProps(dispatch) {
	return {
		salesActions: bindActionCreators(salesActions, dispatch),
		healthCheckActions: bindActionCreators(healthCheckActions, dispatch)
	};
}

export default withRouter(connect(
	mapStateToProps,
	mapDispatchToProps
)(SemaSales));