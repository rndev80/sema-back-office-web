import {
	RECEIVE_CUSTOMER,
	RECEIVE_CUSTOMERS_DATASET,
	customerActions
} from '../actions'

export default function volume(state =init(), action) {
	let newState;
	switch (action.type) {
		case RECEIVE_CUSTOMER:
			newState = action.data;
			console.log('RECEIVE_CUSTOMER Action');
			return newState;
		case RECEIVE_CUSTOMERS_DATASET:
			newState = {...state};
			newState.dataset = action.data;
			console.log('RECEIVE_CUSTOMERS_DATASET Action');
			return newState;
		default:
			return state;
	}
}


function init() {
	return customerActions.initializeCustomer()
}