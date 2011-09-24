(function ($) {
$(function () {
VK.init(function(data) {

VK.api(
    'friends.get',
    { fields: 'uid,first_name,last_name,sex,photo' },
    function (data) {
        if (data.error)
            return;
        
        var friends = data.response;
        for (var i = 0, il = friends.length; i < il; i++) {
            var friend = friends[i],
                p = document.createElement('p');
            
            p.innerHTML = '
                <img src="' + friend.photo + '" />
            ' + [friend.uid, friend.first_name, friend.last_name, friend.sex].join(' ') + '<br />';
            document.body.appendChild(p);
        }
    });
});
});
})(jQuery);
