const jsdom = require( 'jsdom' );
const curl = require( 'curl' );
const FormData = require( 'form-data' );
const Koa = require( 'Koa' );
const Router = require( 'koa-router' );
var bodyParser = require( 'body-parser' );
const TelegramBot = require( 'node-telegram-bot-api' );


const TOKEN = '838448255:AAG-BTbYzV0hA1IK-tt7ym-3k_hWxE4ifOI';
const port = 5000;
const rozklad = 'http://rozklad.kpi.ua';
const ngrokUrl = 'https://7fd81d57.ngrok.io';
const schedules = '/Schedules/';
const scheduleQuery = 'ScheduleGroupSelection.aspx?&mobile=true';

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
const app = new Koa();
const router = Router();


const bot = new TelegramBot( TOKEN, { polling: true } );

function parceDays( data, chatId ) {
  let dayIndex = 0;
  const scheduleHalf = Object.keys( data ).length / 2;
  Object.keys( data ).map( day => {
    if ( ( !days.includes( data[ day ].textContent ) ) && ( day !== '0' ) && ( day !== scheduleHalf.toString() ) ) {
      if ( data[ day ].children.length ) {
        dayIndex !== 0 && schedule[ day <= scheduleHalf - 1 ? '1' : '2' ][ days[ dayIndex - 1 ] ].push( data[ day ].children[ '0' ].textContent );
      } else {
        schedule[ day <= scheduleHalf - 1 ? '1' : '2' ][ days[ dayIndex - 1 ] ].push( '' );
      }
      dayIndex++;
      if ( dayIndex === 7 ) {
        dayIndex = 0;
      }
    }
  }, dayIndex, schedule );
  bot.sendMessage( chatId, `${ Object.keys( schedule ).map( week => `\n${ week }й тиждень 
  ${Object.keys( schedule[ week ] ).map( day => `\n${ day }
  ${schedule[ week ][ day ].map( ( lesson, index ) => ( `\n${ index + 1 }) ${ lesson }` ) ) }` ) }` ) }`, { parse_mode: 'Markdown' } );
}

function parseData( html, chatId ) {
  const { JSDOM } = jsdom;
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  parceDays( document.querySelectorAll( 'table tr td' ), chatId );
}


function getUrl( url, chatId ) {
  curl.get( `${ rozklad }${ url }`, null, ( err, resp, body ) => {
    if ( resp.statusCode == 200 ) {
      parseData( body, chatId );
    }
    else {
      console.error( 'error while fetching url' );
    }
  } );
}


function parseForm( html, chatId, group ) {
  const dom = new JSDOM( html );
  const { window: { document } } = dom;
  const input = document.getElementById( 'ctl00_MainContent_ctl00_txtboxGroup' );
  const submitLink = document.getElementById( 'aspnetForm' ).getAttribute( 'action' );
  input.setAttribute( 'value', group );
  const inputs = document.querySelectorAll( '#aspnetForm input' );


  const form = new FormData();


  inputs.forEach( input => form.append( `${ input.getAttribute( 'name' ) }`, `${ input.getAttribute( 'value' ) }` ), [ form ] );

  form.submit( `${ rozklad }${ schedules }${ submitLink }`, function ( err, res ) {
    if ( res.headers.location ) {
      getUrl( res.headers.location, chatId );
    } else {
      bot.sendMessage( chatId, 'No group' );
    }
  } );
}

function parceSchedle( chatId, group ) {
  curl.get( `${ rozklad }${ schedules }${ scheduleQuery }`, null, ( err, resp, body ) => {
    if ( resp.statusCode == 200 ) {
      parseForm( body, chatId, group );
    }
    else {
      console.error( 'error while fetching url' );
    }
  } );
}



bot.setWebHook( `${ ngrokUrl }/bot` );

bot.on( 'message', ( msg ) => {
  const chatId = msg.chat.id;
  const group = msg.text;
  parceSchedle( chatId, group );
} );

router.post( '/bot', ctx => {
  const { body } = ctx.request;
  console.log( body );
  bot.processUpdate( body );
  ctx.status = 200;
} );

app.use( router.routes() );
app.use( bodyParser );

app.listen( port, () => console.log( 'server started' ) );