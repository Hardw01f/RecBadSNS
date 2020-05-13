'use strict';

let latestFeedId = 0;
let oldestFeedId = 0;

const main = () => {
  (function init() {
    const process = result => {
      if (!result || !result.name) {
        const params = getUrlParams(location.href);
        if ('reset_token' in params) {
          // パスワードリセット画面表示
          $('#modal-password-reset').modal({ keyboard: false, backdrop: 'static' }).modal('show');
          $('#iframe-password-reset').attr('src', `password_reset.html?reset_token=${params['reset_token']}`);
        } else {
          // ログイン・ユーザ登録画面表示
          $('#modal-login').modal({ keyboard: false, backdrop: 'static' }).modal('show');
          $$('footer-login').addEventListener('click', () => {
            $$('header-login').textContent = '新規ユーザ登録';
            $$('footer-login').style.visibility = 'hidden';
          });
        }
      } else {
        // メイン画面
        $$('form-text-feed').reset();
        $$('img-profile').src = result.icon;
        $$('span-self').textContent = result.name;
        $$('div-new-feeds').style.display = 'none';
        $$('div-old-feeds').style.display = 'none';
        loadInitialFeeds();
        document.body.removeChild($$('mask'));
        setInterval(loadNewFeeds, 6000);
      }
    }
    fetcher('/sessions', { method: 'GET' }, process);
  })();

  // ログアウトボタン
  $$('button-logout').addEventListener('click', function (e) {
    const process = result => {
      top.location = '/'; // ログイン画面を表示
    }
    fetcher('/sessions', { method: 'DELETE' }, process);
  });

  // 友だちリストリンク
  $$('link-index-friend').addEventListener('click', loadFriendIndex);

  // 友だちリスト順序選択
  $$('sel-index-friend').addEventListener('change', loadFriendIndex);

  // 友だちリストを更新
  function loadFriendIndex() {
    $$('div-results-index-friend').innerHTML = '';
    const order = $$('sel-index-friend').value;
    const url = `/friends?order=${encodeURIComponent(order)}`;
    const process = result => {
      if (result && result.friends) {
        result.friends.forEach(friend => {
          $$('div-results-index-friend').appendChild(createFriendFragment(friend));
        });
      }
    }
    fetcher(url, { method: 'GET' }, process);
  }

  // 友だち情報のDOM生成
  function createFriendFragment(friend) {
    const range = document.createRange();
    range.selectNode(document.body);

    const fragment = range.createContextualFragment(`
    <div class="user-search-result">
      <p>
        <img id="image">
        <span id="name"></span>
      </p>
    </div>`);

    fragment.getElementById('image').src = `/users/${friend.id}/icon`;
    fragment.getElementById('name').textContent = friend.name;
    return fragment;
  }

  // 友だち検索ボタン
  $$('form-search-user').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $$('input-search-user').value;
    const url = `/friends/search?name=${encodeURIComponent(name)}`;
    const process = result => {
      $$('div-results-search-friend').innerHTML = '';
      if (result && result.friends) {
        result.friends.forEach(friend => {
          $$('div-results-search-friend').appendChild(createAddFriendFragment(friend));
        });
      }
    }
    fetcher(url, { method: 'GET' }, process);
  });

  // 友だち追加フォームのDOM生成
  function createAddFriendFragment(friend) {
    const range = document.createRange();
    range.selectNode(document.body);

    const fragment = range.createContextualFragment(`
    <div class="user-search-result">
      <p>
        <img id="image">
        <span id="name"></span>
      </p>
      <form class="form-search-add-user" id="form">
        <input type="hidden" name="login_id" id="input-login-id">
        <input type="submit" class="btn btn-primary" value="追加">
      </form>
    </div>`);

    fragment.getElementById('image').src = `/users/${friend.id}/icon`;
    fragment.getElementById('name').textContent = friend.name;
    fragment.getElementById('form').onsubmit = function (event) {
      // 友だち追加ボタンが押されたときのアクション
      event.preventDefault();
      const body = new FormData();
      body.append('login_id', this.login_id.value);
      const process = () => {
        $$('button-search-user').click();
        $$('div-feeds').innerHTML = "";
        loadInitialFeeds();
      }
      fetcher('/friends', { method: 'POST', body: body }, process);
      return false;
    };
    fragment.getElementById('input-login-id').value = friend.login_id;
    return fragment;
  }

  // テキストフィード投稿
  $$('form-text-feed').addEventListener('submit', (event) => {
    // テキストが入力されていなければ投稿しない
    if (!$$('input-text-feed').value.length) return;
    event.preventDefault();
    const body = new FormData();
    body.append('comment', $$('input-text-feed').value);
    body.append('feed_type', 'text');
    const process = result => top.location = '/'; // メイン画面を再読み込み
    fetcher('/feeds', { method: 'POST', body: body }, process);
  });

  // 画像フィード投稿
  $$('div-image-drop').addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  $$('div-image-drop').addEventListener('drop', (event) => {
    event.preventDefault();
    $$('div-image-drop').textContent = '画像アップロード中';
    $$('div-image-drop').classList.add('drop-zone-droped');

    const body = new FormData();
    body.append('image', event.dataTransfer.files[0]);
    body.append('feed_type', 'image');
    const process = result => {
      if (result && result.errors) {
        $$('div-image-drop').textContent = 'ここに画像をドロップ';
        $$('div-image-drop').classList.remove('drop-zone-droped');
        result.errors.forEach(value => alert(value));
      } else {
        top.location = '/'; // メイン画面を再読み込み
      }
    }
    fetcher('/feeds', { method: 'POST', body: body }, process);
  });

  // 初期フィード取得
  function loadInitialFeeds() {
    const process = result => {
      if (result.feeds && result.feeds.length > 0) {
        latestFeedId = result.feeds[0].id;
        oldestFeedId = result.feeds[result.feeds.length - 1].id;
        $$('div-feeds').appendChild(createFeedsFragment(result.feeds));
        setTimeout(loadOldFeeds, 1000);
      }
    }
    fetcher('/feeds', { method: 'GET' }, process);
  }

  // 新着フィード取得ボタン
  $$('button-load-new').addEventListener('click', (event) => {
    event.preventDefault();
    loadNewFeeds(true);
  });

  // 過去フィード取得
  function loadNewFeeds(withItems = false) {
    let url = `/feeds/${latestFeedId}/find_new`;
    if (withItems) url += '?include_items=1';
    const process = result => {
      if (result.count > 0) {
        $$('span-new-feed-count').textContent = result.count;
        $$('div-new-feeds').style.display = 'block';
        if (result.feeds && result.feeds.length > 0) {
          latestFeedId = result.feeds[0].id;
          $$('div-feeds').prependChild(createFeedsFragment(result.feeds));
          $$('span-new-feed-count').textContent = 0;
          $$('div-new-feeds').style.display = 'none';
        }
      } else {
        $$('span-new-feed-count').textContent = 0;
        $$('div-new-feeds').style.display = 'none';
      }
    }
    fetcher(url, { method: 'GET' }, process);
  }

  // 過去フィード取得ボタン
  $$('button-load-old').addEventListener('click', (event) => {
    event.preventDefault();
    loadOldFeeds(true);
  });

  // 過去フィード取得
  function loadOldFeeds(withItems = false) {
    let url = `/feeds/${oldestFeedId}/find_old`;
    if (withItems) url += '?include_items=1';
    const process = result => {
      $$('div-old-feeds').style.display = (result.count > 0 ? 'block' : 'none');
      if (result.feeds && result.feeds.length > 0) {
        oldestFeedId = result.feeds[result.feeds.length - 1].id;
        $$('div-feeds').appendChild(createFeedsFragment(result.feeds));
        $$('div-old-feeds').style.display = 'none';
        setTimeout(loadOldFeeds, 1000);
      }
    };
    fetcher(url, { method: 'GET' }, process);
  }

  // フィード複数件のDOM生成
  function createFeedsFragment(feeds) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < feeds.length; i++) {
      fragment.appendChild(createFeedFragment(feeds[i]));
    }
    return fragment;
  }

  // フィード一件のDOM生成
  function createFeedFragment(feed) {
    const range = document.createRange();
    range.selectNode(document.body);

    const fragment = range.createContextualFragment(`
    <div class='feed' id='id'>
      <div class='container'>
        <div class='media'>
          <span class='pull-left'>
            <img class='media-object' id='icon'>
          </span>
          <div class='media-body' id='body'>
            <h4 class='media-heading user-name'>
              <span id='name'></span>
              <small class='datetime' id='time'></small>
            </h4>
            <span id='content'></span>
            <div id='thumbnails'></div>
          </div>
        </div>
      </div>
    </div>`);

    fragment.getElementById('id').id = feed.id;
    fragment.getElementById('icon').src = `/users/${feed.user_id}/icon`;
    fragment.getElementById('name').textContent = feed.name;
    const date = new Date(feed.created_at);
    fragment.getElementById('time').textContent = date.toLocaleString();

    if (feed.feed_type == 'text') {
      // テキストフィードの場合
      const content = fragment.getElementById('content')
      content.textContent = feed.comment;
      // コメント内のURLを抽出
      // ref: http://urlregex.com/
      const urlregex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g
      const urls = feed.comment.match(urlregex);
      if (urls) {
        // URLをaタグに置き換え
        content.innerHTML = content.innerHTML.replace(urlregex, url => {
          return `<a href="${url}">${url}</a>`;
        });
        const thumbnails_div = fragment.getElementById('thumbnails');
        urls.forEach(link_url => {
          // APIからURLに紐づくOpenGraph情報を取得
          const url = `/open_graph?url=${encodeURIComponent(link_url)}`
          const process = result => {
            if (result.errors) return;
            thumbnails_div.appendChild(createThumbnailFragment(result));
          };
          fetcher(url, { method: 'GET' }, process);
        });
      }
    } else {
      // 画像フィードの場合
      const caption = (feed.exif.length > 1) ? `${feed.exif}にて撮影` : '';
      const escaped_caption = escape_html(caption)
      fragment.getElementById('content').innerHTML = `
        <img class='img-responsive img-thumbnail' src='/images/${feed.image_file_name}'>
        <br><small class='exif'>${escaped_caption}</small>`;
    }
    return fragment;
  }

  function escape_html (string) {
      if(typeof string !== 'string') {
        return string;
      }
      return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // OpenGraph情報からサムネイルのDOM生成
  function createThumbnailFragment(open_graph) {
    const range = document.createRange();
    range.selectNode(document.body);

    const fragment = range.createContextualFragment(`
    <div class='thumbnail'>
      <a id='link'>
        <img id='image'>
        <div class='caption'>
          <p class='h6 text-muted' id='url'></p>
          <p class='h5 text-primary' id='title'></p>
        </div>
      </a>
    </div>`);

    fragment.getElementById('link').href = open_graph.url;
    fragment.getElementById('url').textContent = open_graph.url;
    fragment.getElementById('title').textContent = open_graph.title;
    if (open_graph.image) {
      fragment.getElementById('image').src = `data:image/png;base64,${open_graph.image}`;
    }
    return fragment;
  }
}

document.addEventListener('DOMContentLoaded', main);
