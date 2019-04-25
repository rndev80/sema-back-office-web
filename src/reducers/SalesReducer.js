import {
	RECEIVE_SALES,
	RECEIVE_SALES_DATASET,
	UPDATE_SALES_DATASET,
	salesActions
} from '../actions'

export default function sales(state =init(), action) {
	let newState;
	switch (action.type) {
		case RECEIVE_SALES:
			newState = {...state};
			newState.loaded = action.data.loaded;
			newState.salesInfo = action.data.salesInfo;
			console.log('RECEIVE_SALES Action');
			return newState;
		case RECEIVE_SALES_DATASET:
			newState = {...state};
			newState.dataset = action.data;
			console.log('RECEIVE_SALES_DATASET Action');
			return newState;
		case UPDATE_SALES_DATASET:
			newState = {...state};
			newState.dataset.push(...action.data);
			console.log('UPDATE_SALES_DATASET Action');
			return newState;
		default:
			return state;
	}
}


function init() {
	return salesActions.initializeSales()
}