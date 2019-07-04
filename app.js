const jsdom = require( 'jsdom' );
const curl = require( 'curl' );
const FormData = require( 'form-data' );
const Koa = require( 'koa' );
const Router = require( 'koa-router' );
const bodyParser = require( 'koa-bodyparser' );
const TelegramBot = require( 'node-telegram-bot-api' );

const port = 4000;
const BOT_TOKEN = '838448255:AAG-BTbYzV0hA1IK-tt7ym-3k_hWxE4ifOI';
const webHookUrl = 'https://b52dbd0d.ngrok.io';
const rozklad = 'http://rozklad.kpi.ua';
const schedules = '/Schedules/';
const url = 'http://rozklad.kpi.ua/Schedules/ScheduleGroupSelection.aspx';
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

const bot = new TelegramBot( BOT_TOKEN, { polling: true } );
const router = Router();
const { JSDOM } = jsdom;
const app = new Koa();

function parceDays( data, chatId ) {
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

  console.log( `${ Object.keys( schedule ).map( week => `${ week }й тиждень\n
  ${Object.keys( schedule[ week ].map( day => `${ day }\n
  ${schedule[ week ][ day ].map( lesson => `${ lesson }` ) }` ) ) }` ) }` );
}

function parseData( html, chatId ) {
  const { JSDOM } = jsdom;
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  parceDays( document.querySelectorAll( 'table tr td' ), chatId );
}

function getUrl( url, chatId ) {
  curl.get( `${ rozklad } ${ url } `, null, ( err, resp, body ) => {
    if ( resp.statusCode == 200 ) {
      parseData( body, chatId );
    }
    else {
      console.error( 'error while fetching url' );
    }
  } );
}



function parseForm( html, group, chatId ) {
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  const input = document.getElementById( 'ctl00_MainContent_ctl00_txtboxGroup' );
  const submitLink = document.getElementById( 'aspnetForm' ).getAttribute( 'action' );
  input.setAttribute( 'value', 'БС-73' );
  const inputs = document.querySelectorAll( '#aspnetForm input' );


  const form = new FormData();
  console.log( `${ rozklad }${ schedules }${ submitLink }` );

  inputs.forEach( input => form.append( `${ input.getAttribute( 'name' ) } `, `${ input.getAttribute( 'value' ) } ` ), [ form ] );

  form.submit( `${ rozklad }${ schedules }${ submitLink }`, function ( err, res ) {
    console.log( res.headers );
    if ( !res.headers.location ) {
      bot.sendMessage( chatId, 'No group' );
    } else {
      getUrl( res.headers.location, chatId );
    }
  } );
}

function getBody( group, chatId ) {
  curl.get( url, null, ( err, resp, body ) => {
    if ( resp.statusCode == 200 ) {
      parseForm( body, group, chatId );
    }
    else {
      console.error( 'error while fetching url' );
    }
  } );
}

bot.setWebHook( `${ webHookUrl } /bot` );

router.post( '/bot', ctx => {
  ctx.status = 200;
} );

app.use( bodyParser() );
app.use( router.routes() );

app.listen( port, () => {
  console.log( 'server started' );
} );

bot.on( 'message', ( msg ) => {
  const chatId = msg.chat.id;
  const group = msg.text;
  getBody( group, chatId, url );
} );


