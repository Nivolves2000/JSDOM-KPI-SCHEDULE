const jsdom = require( 'jsdom' );
const curl = require( 'curl' );
const FormData = require( 'form-data' );
const request = require( 'request' );


const rozklad = 'http://rozklad.kpi.ua';
const schedules = '/Schedules/';
const days = [ 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота' ];
let schedule = {
  '1': {
    'Понеділок': [],
    'Вівторок': [],
    'Середа': [],
    'Четвер': [],
    'П\'ятниця': [],
    'Субота': [],
  },
  '2': {
    'Понеділок': [],
    'Вівторок': [],
    'Середа': [],
    'Четвер': [],
    'П\'ятниця': [],
    'Субота': [],
  }
};

const { JSDOM } = jsdom;

const url = 'http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx?&mobile=true';

function parceDays( data ) {
  let dayIndex = 0;
  Object.keys( data ).map( day => {
    if ( ( !days.includes( data[ day ].textContent ) ) && ( day !== '0' ) && ( day !== '49' ) ) {
      if ( data[ day ].children.length ) {
        dayIndex !== 0 && schedule[ day <= 48 ? '1' : '2' ][ days[ dayIndex - 1 ] ].push( data[ day ].children[ '0' ].textContent );
      } else {
        schedule[ day <= 48 ? '1' : '2' ][ days[ dayIndex - 1 ] ].push( '' );
      }
      dayIndex++;
      if ( dayIndex === 7 ) {
        dayIndex = 0;
      }
    }
  }, dayIndex, schedule );
  console.log( schedule );
}

function parseData( html ) {
  const { JSDOM } = jsdom;
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  parceDays( document.querySelectorAll( 'table tr td' ) );
}


function getUrl( url ) {
  curl.get( `${ rozklad }${ url }`, null, ( err, resp, body ) => {
    if ( resp.statusCode == 200 ) {
      parseData( body );
    }
    else {
      console.error( 'error while fetching url' );
    }
  } );
}


function parseForm( html ) {
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  const input = document.getElementById( 'ctl00_MainContent_ctl00_txtboxGroup' );
  const submitLink = document.getElementById( 'aspnetForm' ).getAttribute( 'action' );
  input.setAttribute( 'value', 'БС-73' );
  const inputs = document.querySelectorAll( '#aspnetForm input' );


  const form = new FormData();


  inputs.forEach( input => form.append( `${ input.getAttribute( 'name' ) }`, `${ input.getAttribute( 'value' ) }` ), [ form ] );

  form.submit( `${ rozklad }${ schedules }${ submitLink }`, function ( err, res ) {
    getUrl( res.headers.location );
  } );
}

curl.get( url, null, ( err, resp, body ) => {
  if ( resp.statusCode == 200 ) {
    parseForm( body );
  }
  else {
    console.error( 'error while fetching url' );
  }
} );






