import {useEffect, useState} from "react";
import {getYoutubeMeta} from "react-native-youtube-iframe";

export function useRecipeMeta(youtubeId: string) {
    const [thumbnail, setThumbnail] = useState(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);

    useEffect(() => {
        getYoutubeMeta(youtubeId).then(meta => {
            if (meta.thumbnail_url) setThumbnail(meta.thumbnail_url);
        });
    }, [youtubeId]);

    return { thumbnail };
}